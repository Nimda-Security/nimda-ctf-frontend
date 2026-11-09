import { useState, type DragEvent, type FormEvent, type ReactNode } from 'react';
import {
  Link,
  Navigate,
  useNavigate,
  useOutletContext,
} from 'react-router-dom';
import { canCreateChallenge, logoutAPI, type CurrentUser } from '@/api/auth';
import { CATEGORIES, createChallenge, type Category } from '@/api/ctf';
import Layout from '@/components/Layout';
import './ChallengeCreate.css';

type Isolation = 'NONE' | 'SHARED' | 'PER_USER';
type FlagType = 'STATIC' | 'DYNAMIC';
type FieldErrors = Partial<
  Record<'code' | 'title' | 'description' | 'points' | 'flag' | 'zipFile', string>
>;

const CODE_PATTERN = /^[a-zA-Z0-9_-]{1,50}$/;
const MAX_ZIP_BYTES = 10 * 1024 * 1024;
const ISOLATIONS: Isolation[] = ['SHARED', 'PER_USER', 'NONE'];
const FLAG_TYPES: FlagType[] = ['STATIC', 'DYNAMIC'];
const STATIC_CATEGORIES = 'REVERSING · FORENSICS · CRYPTO · MISC';

const allowedIsolations = (category: Category): Isolation[] => {
  if (category === 'WEB') return ['SHARED', 'PER_USER'];
  if (category === 'PWN') return ['PER_USER'];
  return ['NONE'];
};

const allowedFlagTypes = (isolation: Isolation): FlagType[] =>
  isolation === 'PER_USER' ? ['STATIC', 'DYNAMIC'] : ['STATIC'];

const COMBINATIONS: {
  label: string;
  flags: string;
  matches: (category: Category, isolation: Isolation) => boolean;
}[] = [
  {
    label: 'WEB · SHARED',
    flags: 'STATIC',
    matches: (c, i) => c === 'WEB' && i === 'SHARED',
  },
  {
    label: 'WEB · PER_USER',
    flags: 'STATIC, DYNAMIC',
    matches: (c, i) => c === 'WEB' && i === 'PER_USER',
  },
  {
    label: 'PWN · PER_USER',
    flags: 'STATIC, DYNAMIC',
    matches: (c) => c === 'PWN',
  },
  {
    label: `${STATIC_CATEGORIES} / NONE`,
    flags: 'STATIC',
    matches: (_, i) => i === 'NONE',
  },
];

const NOTES = [
  'ROLE_DEV 전용 화면입니다. 권한이 없으면 등록 API가 403을 돌려줍니다.',
  '등록 후 수정 API가 없어 삭제 후 다시 등록해야 합니다.',
  '허용되지 않는 조합은 선택지를 비활성화해 막습니다.',
];

interface FieldProps {
  label: string;
  requirement: string;
  helper?: string;
  error?: string;
  children: ReactNode;
}

const Field = ({ label, requirement, helper, error, children }: FieldProps) => (
  <div className="cc-field">
    <div className="cc-field__label">
      <span>{label}</span>
      <small>{requirement}</small>
    </div>
    {children}
    {error ? (
      <p className="cc-field__helper cc-field__helper--error" role="alert">
        {error}
      </p>
    ) : (
      helper && <p className="cc-field__helper">{helper}</p>
    )}
  </div>
);

interface SegmentsProps<T extends string> {
  options: readonly T[];
  value: T;
  allowed?: readonly T[];
  labels?: Partial<Record<T, string>>;
  onChange: (value: T) => void;
}

const Segments = <T extends string>({
  options,
  value,
  allowed = options,
  labels,
  onChange,
}: SegmentsProps<T>) => (
  <div className="cc-segments">
    {options.map((option) => (
      <button
        key={option}
        type="button"
        aria-pressed={value === option}
        disabled={!allowed.includes(option)}
        className={value === option ? 'cc-segment cc-segment--on' : 'cc-segment'}
        onClick={() => onChange(option)}
      >
        {labels?.[option] ?? option}
      </button>
    ))}
  </div>
);

function ChallengeCreatePage() {
  const user = useOutletContext<CurrentUser>();
  const navigate = useNavigate();

  const [code, setCode] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<Category>('WEB');
  const [points, setPoints] = useState('100');
  const [isolation, setIsolation] = useState<Isolation>('PER_USER');
  const [flagType, setFlagType] = useState<FlagType>('STATIC');
  const [flag, setFlag] = useState('');
  const [zipFile, setZipFile] = useState<File | null>(null);
  const [visibility, setVisibility] = useState<'DRAFT' | 'PUBLIC'>('DRAFT');
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!canCreateChallenge(user)) return <Navigate to="/" replace />;

  const isolationOptions = allowedIsolations(category);
  const flagOptions = allowedFlagTypes(isolation);
  const isStaticCategory = isolationOptions[0] === 'NONE';

  const applyIsolation = (next: Isolation) => {
    setIsolation(next);
    if (!allowedFlagTypes(next).includes(flagType)) setFlagType('STATIC');
  };

  const handleCategory = (next: Category) => {
    setCategory(next);
    const options = allowedIsolations(next);
    if (!options.includes(isolation)) {
      applyIsolation(options[options.length - 1]);
    }
  };

  const selectFile = (file: File | undefined) => {
    if (!file) return;
    setErrors((prev) => ({ ...prev, zipFile: undefined }));
    if (!file.name.toLowerCase().endsWith('.zip')) {
      setErrors((prev) => ({ ...prev, zipFile: '.zip 파일만 올릴 수 있습니다.' }));
      return;
    }
    if (file.size > MAX_ZIP_BYTES) {
      setErrors((prev) => ({ ...prev, zipFile: '최대 10MB까지 올릴 수 있습니다.' }));
      return;
    }
    setZipFile(file);
  };

  const handleDrop = (e: DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    selectFile(e.dataTransfer.files[0]);
  };

  const validate = () => {
    const next: FieldErrors = {};
    if (!CODE_PATTERN.test(code.trim())) {
      next.code = '문제 코드는 영문/숫자/-/_ 만 사용할 수 있습니다. (1~50자)';
    }
    if (!title.trim()) next.title = '제목은 필수입니다.';
    if (!description.trim()) next.description = '설명은 필수입니다.';
    if (points.trim() && !/^\d+$/.test(points.trim())) {
      next.points = '점수는 0 이상의 정수로 입력해 주세요.';
    }
    if (flagType === 'STATIC' && !flag.trim()) {
      next.flag = 'STATIC 문제는 플래그가 필요합니다.';
    }
    return next;
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isSubmitting) return;

    setFormError(null);
    const nextErrors = validate();
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    const form = new FormData();
    form.append('code', code.trim());
    form.append('title', title.trim());
    form.append('description', description);
    form.append('category', category);
    if (points.trim()) form.append('points', points.trim());
    form.append('flagType', flagType);
    if (flagType === 'STATIC') form.append('flag', flag);
    form.append('isolationType', isolation);
    if (zipFile) form.append('zipFile', zipFile);
    form.append('isPublic', String(visibility === 'PUBLIC'));

    setIsSubmitting(true);
    const result = await createChallenge(form);
    setIsSubmitting(false);

    if (result.status === 'ok') {
      navigate('/', { replace: true });
    } else if (result.status === 'duplicate') {
      setErrors({ code: result.message });
    } else {
      setFormError(result.message);
    }
  };

  const handleLogout = async () => {
    await logoutAPI();
    navigate('/login', { replace: true });
  };

  return (
    <Layout user={user} onLogout={handleLogout}>
      <div className="cc">
        <p className="cc__breadcrumb">CTF / ADMIN / NEW</p>
        <p className="cc__badge">DEV ONLY</p>
        <h1 className="cc__title">문제 추가</h1>

        <div className="cc__columns">
          <form className="cc__form" onSubmit={handleSubmit} noValidate>
            <section className="cc__section">
              <h2>BASIC</h2>
              <div className="cc__row">
                <Field
                  label="문제 코드 (code)"
                  requirement="필수"
                  helper="영문, 숫자, -, _ 만 사용 · 1~50자 · 중복 불가"
                  error={errors.code}
                >
                  <input
                    className="cc-input"
                    value={code}
                    maxLength={50}
                    placeholder="web-basic-01"
                    aria-invalid={Boolean(errors.code)}
                    onChange={(e) => setCode(e.target.value)}
                  />
                </Field>
                <Field
                  label="제목 (title)"
                  requirement="필수"
                  helper="참가자 목록에 표시됩니다"
                  error={errors.title}
                >
                  <input
                    className="cc-input"
                    value={title}
                    placeholder="첫 번째 웹 문제"
                    aria-invalid={Boolean(errors.title)}
                    onChange={(e) => setTitle(e.target.value)}
                  />
                </Field>
              </div>

              <Field
                label="설명 (description)"
                requirement="필수"
                helper="문제 상세 화면에 표시됩니다"
                error={errors.description}
              >
                <textarea
                  className="cc-input cc-input--area"
                  value={description}
                  placeholder="문제 설명을 입력하세요."
                  aria-invalid={Boolean(errors.description)}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </Field>

              <Field label="분류 (category)" requirement="필수">
                <Segments
                  options={CATEGORIES}
                  value={category}
                  onChange={handleCategory}
                />
              </Field>

              <div className="cc__row">
                <Field
                  label="점수 (points)"
                  requirement="선택"
                  helper="비워 두면 100점"
                  error={errors.points}
                >
                  <input
                    className="cc-input"
                    inputMode="numeric"
                    value={points}
                    aria-invalid={Boolean(errors.points)}
                    onChange={(e) => setPoints(e.target.value)}
                  />
                </Field>
                <div />
              </div>
            </section>

            <section className="cc__section">
              <h2>RUNTIME</h2>
              <div className="cc__row">
                <Field
                  label="격리 방식 (isolationType)"
                  requirement={isStaticCategory ? '고정' : '필수'}
                  helper={
                    isStaticCategory
                      ? `${STATIC_CATEGORIES} 선택 시`
                      : category === 'WEB'
                        ? 'WEB은 SHARED 또는 PER_USER'
                        : 'PWN은 PER_USER만 사용'
                  }
                >
                  <Segments
                    options={ISOLATIONS}
                    value={isolation}
                    allowed={isolationOptions}
                    onChange={applyIsolation}
                  />
                </Field>
                <Field
                  label="플래그 방식 (flagType)"
                  requirement={flagOptions.length === 1 ? '고정' : '선택'}
                  helper={
                    flagOptions.length === 1
                      ? 'SHARED와 정적 문제는 STATIC만 사용합니다'
                      : 'DYNAMIC을 고르면 플래그 입력을 숨깁니다'
                  }
                >
                  <Segments
                    options={FLAG_TYPES}
                    value={flagType}
                    allowed={flagOptions}
                    onChange={setFlagType}
                  />
                </Field>
              </div>

              {flagType === 'STATIC' && (
                <Field
                  label="플래그 (flag)"
                  requirement="STATIC이면 필수"
                  helper="해시로만 저장되어 등록 후 원문을 볼 수 없습니다"
                  error={errors.flag}
                >
                  <input
                    className="cc-input"
                    value={flag}
                    placeholder="NIMDA{...}"
                    autoComplete="off"
                    aria-invalid={Boolean(errors.flag)}
                    onChange={(e) => setFlag(e.target.value)}
                  />
                </Field>
              )}
            </section>

            <section className="cc__section">
              <h2>FILE &amp; PUBLISH</h2>
              <div className="cc__row">
                <Field
                  label="문제 파일 (zipFile)"
                  requirement="선택"
                  error={errors.zipFile}
                >
                  <label
                    className="cc-drop"
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={handleDrop}
                  >
                    <input
                      type="file"
                      accept=".zip,application/zip"
                      onChange={(e) => {
                        selectFile(e.target.files?.[0]);
                        e.target.value = '';
                      }}
                    />
                    <strong>
                      {zipFile ? zipFile.name : '.zip 파일을 끌어다 놓거나 선택'}
                    </strong>
                    <span>
                      {zipFile
                        ? `${(zipFile.size / 1024 / 1024).toFixed(2)} MB`
                        : '최대 10MB'}
                    </span>
                  </label>
                  {zipFile && (
                    <button
                      type="button"
                      className="cc-drop__remove"
                      onClick={() => setZipFile(null)}
                    >
                      파일 제거
                    </button>
                  )}
                </Field>
                <Field
                  label="공개 여부 (isPublic)"
                  requirement="필수"
                  helper="초안은 관리자와 DEV에게만 보입니다"
                >
                  <Segments
                    options={['DRAFT', 'PUBLIC'] as const}
                    labels={{ DRAFT: '초안으로 저장', PUBLIC: '바로 공개' }}
                    value={visibility}
                    onChange={setVisibility}
                  />
                </Field>
              </div>
            </section>

            {formError && (
              <p className="cc__form-error" role="alert">
                {formError}
              </p>
            )}

            <div className="cc__actions">
              <Link to="/" className="cc-button cc-button--ghost">
                취소
              </Link>
              <button
                type="submit"
                className="cc-button cc-button--primary"
                disabled={isSubmitting}
              >
                {isSubmitting ? '등록 중...' : '문제 등록'}
              </button>
            </div>
          </form>

          <aside className="cc__side">
            <section className="cc-panel">
              <h2>ALLOWED COMBINATIONS</h2>
              {COMBINATIONS.map((combo) => (
                <div
                  key={combo.label}
                  className={
                    combo.matches(category, isolation)
                      ? 'cc-combo cc-combo--on'
                      : 'cc-combo'
                  }
                >
                  <strong>{combo.label}</strong>
                  <span>{combo.flags}</span>
                </div>
              ))}
            </section>
            <section className="cc-panel">
              <h2>NOTES</h2>
              {NOTES.map((note) => (
                <p key={note}>&gt; {note}</p>
              ))}
            </section>
          </aside>
        </div>
      </div>
    </Layout>
  );
}

export default ChallengeCreatePage;
