import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { Navigate, useNavigate, useOutletContext } from 'react-router-dom';
import { canManageTeams, logoutAPI, type CurrentUser } from '@/api/auth';
import type { ApiResult } from '@/api/client';
import {
  addTeamMembers,
  changeTeamLeader,
  createTeam,
  deleteTeam,
  getTeams,
  getUnassignedUsers,
  removeTeamMember,
  updateTeam,
  type Team,
  type UnassignedUser,
} from '@/api/teams';
import Layout from '@/components/Layout';
import './TeamBuilding.css';

const MAX_CAPACITY = 15;
const SEARCH_DEBOUNCE_MS = 300;

type Notice = { tone: 'ok' | 'error'; message: string } | null;
type Modal =
  | { type: 'create' }
  | { type: 'edit'; team: Team }
  | { type: 'delete'; team: Team }
  | null;

const remaining = (team: Team) => team.capacity - team.memberCount;

interface TeamFormProps {
  initial?: Team;
  selected: UnassignedUser[];
  busy: boolean;
  onCancel: () => void;
  onSubmit: (input: {
    name: string;
    capacity: number;
    description: string;
    includeSelected: boolean;
    leaderUserId?: number;
  }) => void;
}

const TeamForm = ({ initial, selected, busy, onCancel, onSubmit }: TeamFormProps) => {
  const [name, setName] = useState(initial?.name ?? '');
  const [capacity, setCapacity] = useState(String(initial?.capacity ?? 5));
  const [description, setDescription] = useState(initial?.description ?? '');
  const [includeSelected, setIncludeSelected] = useState(!initial && selected.length > 0);
  const [leader, setLeader] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const cap = Number(capacity);
    if (!name.trim()) return setError('팀 이름을 입력해 주세요.');
    if (!Number.isInteger(cap) || cap < 1 || cap > MAX_CAPACITY) {
      return setError(`최대 인원은 1~${MAX_CAPACITY}명입니다.`);
    }
    if (initial && cap < initial.memberCount) {
      return setError(`현재 멤버 수(${initial.memberCount})보다 작게 할 수 없습니다.`);
    }
    if (includeSelected && selected.length > cap) {
      return setError(`선택한 참가자(${selected.length}명)가 최대 인원보다 많습니다.`);
    }
    setError(null);
    onSubmit({
      name: name.trim(),
      capacity: cap,
      description: description.trim(),
      includeSelected,
      leaderUserId: includeSelected && leader ? Number(leader) : undefined,
    });
  };

  return (
    <form className="tb-form" onSubmit={handleSubmit} noValidate>
      <div className="tb-form__row">
        <label className="tb-field">
          <span>
            팀 이름 <small>필수</small>
          </span>
          <input
            value={name}
            maxLength={50}
            autoFocus
            onChange={(e) => setName(e.target.value)}
          />
          <small>50자 이내 · 중복 불가</small>
        </label>
        <label className="tb-field">
          <span>
            최대 인원 <small>필수</small>
          </span>
          <input
            inputMode="numeric"
            value={capacity}
            onChange={(e) => setCapacity(e.target.value)}
          />
          <small>1~{MAX_CAPACITY}명</small>
        </label>
      </div>
      <label className="tb-field">
        <span>
          설명 <small>선택</small>
        </span>
        <input
          value={description}
          maxLength={200}
          onChange={(e) => setDescription(e.target.value)}
        />
        <small>200자 이내</small>
      </label>

      {!initial && selected.length > 0 && (
        <div className="tb-field">
          <label className="tb-check">
            <input
              type="checkbox"
              checked={includeSelected}
              onChange={(e) => setIncludeSelected(e.target.checked)}
            />
            선택한 참가자 {selected.length}명을 함께 배정
          </label>
          {includeSelected && (
            <>
              <div className="tb-chips">
                {selected.map((u) => (
                  <span key={u.userId} className="tb-chip">
                    {u.nickname}
                  </span>
                ))}
              </div>
              <label className="tb-field">
                <span>
                  팀장 <small>선택</small>
                </span>
                <select value={leader} onChange={(e) => setLeader(e.target.value)}>
                  <option value="">팀장 없음</option>
                  {selected.map((u) => (
                    <option key={u.userId} value={u.userId}>
                      {u.nickname} ({u.loginId})
                    </option>
                  ))}
                </select>
              </label>
            </>
          )}
        </div>
      )}

      {error && (
        <p className="tb-form__error" role="alert">
          {error}
        </p>
      )}
      <div className="tb-actions">
        <button type="button" className="tb-btn" onClick={onCancel}>
          취소
        </button>
        <button type="submit" className="tb-btn tb-btn--primary" disabled={busy}>
          {initial ? '저장' : '만들기'}
        </button>
      </div>
    </form>
  );
};

function TeamBuildingPage() {
  const user = useOutletContext<CurrentUser>();
  const navigate = useNavigate();

  const [teams, setTeams] = useState<Team[] | null>(null);
  const [unassigned, setUnassigned] = useState<UnassignedUser[] | null>(null);
  const [keyword, setKeyword] = useState('');
  // 검색으로 목록이 바뀌어도 선택은 유지해야 해서 목록과 따로 둔다.
  const [selected, setSelected] = useState<Map<number, UnassignedUser>>(new Map());
  const [targetTeamId, setTargetTeamId] = useState<number | null>(null);
  const [notice, setNotice] = useState<Notice>(null);
  const [modal, setModal] = useState<Modal>(null);
  const [busy, setBusy] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  const allowed = canManageTeams(user);

  const handle = useCallback(
    <T,>(result: ApiResult<T>) => {
      if (result.status === 'unauthenticated') navigate('/login', { replace: true });
      return result;
    },
    [navigate]
  );

  useEffect(() => {
    if (!allowed) return;
    const controller = new AbortController();
    getTeams(controller.signal)
      .then((r) => {
        const res = handle(r);
        if (res.status === 'ok') setTeams(res.data);
        else if (res.status === 'error') setNotice({ tone: 'error', message: res.message });
      })
      .catch(() => {});
    return () => controller.abort();
  }, [allowed, handle, reloadKey]);

  useEffect(() => {
    if (!allowed) return;
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      getUnassignedUsers(keyword, controller.signal)
        .then((r) => {
          const res = handle(r);
          if (res.status === 'ok') {
            setUnassigned(res.data);
            // 전체 목록을 받았을 때만, 그새 배정돼 빠진 사람을 선택에서도 뺀다.
            if (!keyword.trim()) {
              const ids = new Set(res.data.map((u) => u.userId));
              setSelected(
                (prev) => new Map([...prev].filter(([id]) => ids.has(id)))
              );
            }
          } else if (res.status === 'error') {
            setNotice({ tone: 'error', message: res.message });
          }
        })
        .catch(() => {});
    }, SEARCH_DEBOUNCE_MS);
    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [allowed, handle, keyword, reloadKey]);

  const selectedUsers = useMemo(() => [...selected.values()], [selected]);
  const openTeams = useMemo(() => (teams ?? []).filter((t) => remaining(t) > 0), [teams]);
  const target = openTeams.find((t) => t.id === targetTeamId) ?? openTeams[0] ?? null;

  if (!allowed) return <Navigate to="/" replace />;

  const reload = () => setReloadKey((k) => k + 1);

  // 성공하면 알림, 실패하면 서버 메시지를 보여주고 목록을 다시 불러온다.
  const run = async <T,>(action: () => Promise<ApiResult<T>>, success: string) => {
    setBusy(true);
    const result = handle(await action());
    setBusy(false);
    if (result.status === 'ok') {
      setNotice({ tone: 'ok', message: success });
    } else if (result.status === 'error') {
      setNotice({ tone: 'error', message: result.message });
    }
    reload();
    return result.status === 'ok';
  };

  const toggle = (user: UnassignedUser) =>
    setSelected((prev) => {
      const next = new Map(prev);
      if (next.has(user.userId)) next.delete(user.userId);
      else next.set(user.userId, user);
      return next;
    });

  const assign = async () => {
    if (!target || selected.size === 0) return;
    const ok = await run(
      () => addTeamMembers(target.id, [...selected.keys()]),
      `${selected.size}명을 ${target.name}에 배정했습니다.`
    );
    if (ok) setSelected(new Map());
  };

  const handleLogout = async () => {
    await logoutAPI();
    navigate('/login', { replace: true });
  };

  const assignedCount = (teams ?? []).reduce((sum, t) => sum + t.memberCount, 0);
  const maxCapacity = teams?.length ? Math.max(...teams.map((t) => t.capacity)) : '-';

  return (
    <Layout user={user} onLogout={handleLogout}>
      <div className="tb">
        <header className="tb-head">
          <div>
            <p className="tb-head__crumb">CTF / ADMIN / TEAMS</p>
            <p className="tb-head__badge">ADMIN ONLY</p>
            <h1 className="tb-head__title">팀 빌딩</h1>
            <p className="tb-head__lead">
              운영자가 팀을 만들고 참가자를 배정합니다. 한 참가자는 한 팀에만 속할 수 있습니다.
            </p>
          </div>
          <button
            type="button"
            className="tb-btn tb-btn--primary"
            onClick={() => setModal({ type: 'create' })}
          >
            + 팀 만들기
          </button>
        </header>

        <div className="tb-stats">
          {[
            ['전체 팀', teams ? String(teams.length) : '-', false],
            ['배정된 참가자', teams ? String(assignedCount) : '-', false],
            [
              keyword.trim() ? '검색된 미배정 참가자' : '미배정 참가자',
              unassigned ? String(unassigned.length) : '-',
              Boolean(unassigned?.length),
            ],
            ['팀당 최대 인원', String(maxCapacity), false],
          ].map(([label, value, alert]) => (
            <div key={String(label)} className="tb-stat">
              <span>{label}</span>
              <strong className={alert ? 'tb-stat--alert' : undefined}>{value}</strong>
            </div>
          ))}
        </div>

        {notice && (
          <p
            className={`tb-notice tb-notice--${notice.tone}`}
            role={notice.tone === 'error' ? 'alert' : 'status'}
          >
            {notice.message}
            <button type="button" aria-label="알림 닫기" onClick={() => setNotice(null)}>
              ×
            </button>
          </p>
        )}

        <div className="tb-columns">
          <section className="tb-panel tb-unassigned" aria-label="미배정 참가자">
            <div className="tb-panel__head">
              <h2>UNASSIGNED</h2>
              <span className="tb-count">{unassigned ? `${unassigned.length}명` : ''}</span>
            </div>
            <input
              className="tb-search"
              type="search"
              placeholder="닉네임·아이디 검색"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
            />
            <ul className="tb-users">
              {unassigned === null && <li className="tb-empty">불러오는 중입니다.</li>}
              {unassigned?.length === 0 && (
                <li className="tb-empty">
                  {keyword.trim() ? '검색 결과가 없습니다.' : '모든 참가자가 배정되었습니다.'}
                </li>
              )}
              {unassigned?.map((u) => (
                <li key={u.userId}>
                  <label
                    className={selected.has(u.userId) ? 'tb-user tb-user--on' : 'tb-user'}
                  >
                    <input
                      type="checkbox"
                      checked={selected.has(u.userId)}
                      onChange={() => toggle(u)}
                    />
                    <span className="tb-user__text">
                      <strong>{u.nickname}</strong>
                      <small>
                        {u.loginId}
                        {u.studentNum ? ` · ${u.studentNum}` : ''}
                      </small>
                    </span>
                  </label>
                </li>
              ))}
            </ul>
            <div className="tb-assign">
              <strong>{selected.size}명 선택됨</strong>
              <div className="tb-assign__row">
                <select
                  aria-label="배정할 팀"
                  value={target?.id ?? ''}
                  disabled={openTeams.length === 0}
                  onChange={(e) => setTargetTeamId(Number(e.target.value))}
                >
                  {openTeams.length === 0 && <option value="">정원이 남은 팀 없음</option>}
                  {openTeams.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.memberCount}/{t.capacity})
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  className="tb-btn tb-btn--primary"
                  disabled={busy || !target || selected.size === 0}
                  onClick={assign}
                >
                  배정
                </button>
              </div>
              <small>정원이 남은 팀만 고를 수 있습니다.</small>
            </div>
          </section>

          <section className="tb-teams" aria-label="팀 목록">
            <div className="tb-teams__head">
              <h2>팀 목록</h2>
              <span>팀 이름 순</span>
            </div>
            {teams === null && <p className="tb-empty">불러오는 중입니다.</p>}
            {teams?.length === 0 && (
              <p className="tb-empty tb-empty--box">
                아직 팀이 없습니다. "+ 팀 만들기"로 첫 팀을 만드세요.
              </p>
            )}
            <div className="tb-grid">
              {teams?.map((team) => {
                const full = remaining(team) <= 0;
                return (
                  <article key={team.id} className={full ? 'tb-card tb-card--full' : 'tb-card'}>
                    <div className="tb-card__head">
                      <h3>{team.name}</h3>
                      <span className={full ? 'tb-card__cap tb-card__cap--full' : 'tb-card__cap'}>
                        {team.memberCount} / {team.capacity}
                        {full && '  마감'}
                      </span>
                    </div>
                    <p className="tb-card__desc">{team.description || '설명 없음'}</p>
                    <hr />
                    {team.members.length === 0 && (
                      <p className="tb-card__desc">
                        아직 멤버가 없습니다. 왼쪽에서 참가자를 선택해 배정하세요.
                      </p>
                    )}
                    <ul className="tb-members">
                      {team.members.map((m) => (
                        <li key={m.userId} className="tb-member">
                          {m.role === 'LEADER' && <span className="tb-badge">팀장</span>}
                          <strong>{m.nickname}</strong>
                          <small>{m.loginId}</small>
                          {m.role !== 'LEADER' && (
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() =>
                                run(
                                  () => changeTeamLeader(team.id, m.userId),
                                  `${m.nickname}님을 ${team.name}의 팀장으로 지정했습니다.`
                                )
                              }
                            >
                              팀장 지정
                            </button>
                          )}
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() =>
                              run(
                                () => removeTeamMember(team.id, m.userId),
                                `${m.nickname}님을 ${team.name}에서 제거했습니다.`
                              )
                            }
                          >
                            제거
                          </button>
                        </li>
                      ))}
                    </ul>
                    <div className="tb-card__actions">
                      <button
                        type="button"
                        className="tb-btn"
                        disabled={full}
                        onClick={() => setTargetTeamId(team.id)}
                      >
                        {target?.id === team.id && !full ? '배정 대상' : '멤버 추가'}
                      </button>
                      <button
                        type="button"
                        className="tb-btn"
                        onClick={() => setModal({ type: 'edit', team })}
                      >
                        수정
                      </button>
                      <button
                        type="button"
                        className="tb-card__delete"
                        onClick={() => setModal({ type: 'delete', team })}
                      >
                        삭제
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        </div>
      </div>

      {modal && (
        <div
          className="tb-overlay"
          role="presentation"
          onKeyDown={(e) => e.key === 'Escape' && setModal(null)}
          onClick={(e) => e.target === e.currentTarget && setModal(null)}
        >
          <div className="tb-modal" role="dialog" aria-modal="true" aria-label="팀 관리">
            {modal.type === 'delete' ? (
              <>
                <h2>{modal.team.name} 팀을 삭제할까요?</h2>
                <p>
                  멤버 {modal.team.memberCount}명은 미배정 상태로 돌아가고 팀 점수판에서도 빠집니다.
                  정답 기록은 남습니다.
                </p>
                <div className="tb-actions">
                  <button type="button" className="tb-btn" onClick={() => setModal(null)}>
                    취소
                  </button>
                  <button
                    type="button"
                    className="tb-btn tb-btn--danger"
                    disabled={busy}
                    onClick={async () => {
                      await run(() => deleteTeam(modal.team.id), `${modal.team.name} 팀을 삭제했습니다.`);
                      setModal(null);
                    }}
                  >
                    삭제
                  </button>
                </div>
              </>
            ) : (
              <>
                <h2>{modal.type === 'edit' ? '팀 수정' : '팀 만들기'}</h2>
                <TeamForm
                  initial={modal.type === 'edit' ? modal.team : undefined}
                  selected={selectedUsers}
                  busy={busy}
                  onCancel={() => setModal(null)}
                  onSubmit={async (input) => {
                    const base = {
                      name: input.name,
                      capacity: input.capacity,
                      description: input.description || undefined,
                    };
                    const ok =
                      modal.type === 'edit'
                        ? await run(() => updateTeam(modal.team.id, base), `${input.name} 팀을 수정했습니다.`)
                        : await run(
                            () =>
                              createTeam({
                                ...base,
                                memberUserIds: input.includeSelected ? [...selected.keys()] : [],
                                leaderUserId: input.leaderUserId,
                              }),
                            `${input.name} 팀을 만들었습니다.`
                          );
                    if (ok) {
                      if (modal.type === 'create' && input.includeSelected) setSelected(new Map());
                      setModal(null);
                    }
                  }}
                />
              </>
            )}
          </div>
        </div>
      )}
    </Layout>
  );
}

export default TeamBuildingPage;
