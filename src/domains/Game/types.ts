export type RoomId = 'lobby' | 'stage1' | 'stage2';

export type ChallengeCategory = 'FORENSICS' | 'REVERSING' | 'WEB' | 'PWN';

export type CharacterSkin = 'white' | 'red' | 'dark' | 'teal' | 'clone';

export type PlayerSkin = 'white' | 'red' | 'dark';

export interface Point {
  x: number;
  y: number;
}

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface DialogueLine {
  speaker: string;
  speakerRole?: 'president' | 'vice' | 'clone' | 'system' | 'object';
  text: string;
}

export type FurnitureKind =
  | 'whiteboard'
  | 'standby-tv'
  | 'coat-rack'
  | 'desk'
  | 'chair'
  | 'printer-table'
  | 'mirror'
  | 'cabinet-box'
  | 'mini-fridge'
  | 'mini-arcade'
  | 'copier'
  | 'door-right'
  | 'door-left'
  | 'mannequin'
  | 'bulletin-board'
  | 'arcade-runner'
  | 'arcade-rhythm'
  | 'photo-booth'
  | 'counter-usb'
  | 'prize-kiosk'
  | 'distorted-whiteboard'
  | 'crt-tv'
  | 'clone-table'
  | 'laptop-desk'
  | 'disposal-locker'
  | 'kiosk-terminal'
  | 'exit-door';

export type ObjectAction =
  | { type: 'dialogue'; lines: DialogueLine[] }
  | { type: 'tv'; lines: DialogueLine[]; targetRoom: RoomId }
  | {
      type: 'portal';
      targetRoom: RoomId;
      spawnKey: string;
      requiresStage1Complete?: boolean;
    }
  | { type: 'challenge'; challengeId: string; introLines?: DialogueLine[] }
  | { type: 'stage2-exit' };

export interface RoomObject {
  id: string;
  name: string;
  kind: FurnitureKind;
  /** Visual bounding box in logical map coordinates */
  x: number;
  y: number;
  w: number;
  h: number;
  /** Optional collision box (if omitted, object is non-blocking) */
  collider?: Rect;
  /** Optional custom interaction center & radius (defaults to object center) */
  interactPoint?: Point;
  interactRadius?: number;
  /** Optional real image asset path to replace the temporary procedural graphic */
  spriteUrl?: string;
  /** Optional visual variant parameters for procedural renderer */
  variant?: {
    chairColor?: 'charcoal' | 'burgundy' | 'teal' | 'stone';
    deskProp?: 'laptop' | 'mug' | 'cube' | 'none';
    doorLabel?: string;
    doorTone?: 'warm' | 'lavender' | 'dark' | 'exit';
    facing?: 'up' | 'down' | 'left' | 'right';
  };
  /** Depth sorting Y override (defaults to y + h) */
  sortY?: number;
  /** Interactive behavior (undefined = purely decorative / solid furniture) */
  action?: ObjectAction;
}

export interface NpcEntity {
  id: string;
  name: string;
  displayTag?: string;
  skin: CharacterSkin;
  x: number;
  y: number;
  radius: number;
  solid?: boolean;
  interactRadius?: number;
  spriteUrl?: string;
  lines: DialogueLine[];
}

export interface RoomDefinition {
  id: RoomId;
  code: string;
  title: string;
  subtitle: string;
  theme: 'lobby' | 'stage1' | 'stage2';
  width: number;
  height: number;
  walkBounds: Rect;
  spawns: Record<string, Point>;
  objects: RoomObject[];
  npcs: NpcEntity[];
}

export interface SouvenirData {
  id: string;
  name: string;
  stage: 'stage1' | 'stage2';
  icon: string;
  challengeId: string;
  challengeTitle: string;
  category: ChallengeCategory;
  story: string;
}

export interface ChallengeData {
  id: string;
  stage: 'stage1' | 'stage2';
  objectName: string;
  title: string;
  category: ChallengeCategory;
  difficulty: string;
  points: number;
  flavorQuote: string;
  description: string;
  artifactHint: string;
  /** Local prototype test flag — to be replaced with server validation later */
  testFlag: string;
  souvenir: SouvenirData;
}

export interface InteractTarget {
  id: string;
  name: string;
  x: number;
  y: number;
  source:
    | { kind: 'object'; object: RoomObject }
    | { kind: 'npc'; npc: NpcEntity };
}

export type ActiveModal =
  | { type: 'dialogue'; title: string; lines: DialogueLine[]; cta?: { label: string; onConfirm: () => void } }
  | { type: 'challenge'; challengeId: string }
  | { type: 'souvenir'; souvenirId: string }
  | { type: 'stage1-complete' }
  | { type: 'stage2-ending' };

export interface GameProgressState {
  solvedChallengeIds: string[];
  collectedSouvenirIds: string[];
  stage2Unlocked: boolean;
  playerSkin: PlayerSkin;
}
