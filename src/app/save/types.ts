export type Vec2Snapshot = { x: number; y: number }

export type Transform2DSnapshot = {
  position: Vec2Snapshot
  rotation: number
  scale: Vec2Snapshot
}

export type ComponentSnapshot = {
  type: string
  enabled: boolean
  data: unknown
}

export type GameObjectSnapshot = {
  id: string
  name: string
  tag: string
  active: boolean
  transform: Transform2DSnapshot
  components: ComponentSnapshot[]
}

export type Camera2DSnapshot = {
  position: Vec2Snapshot
  zoom: number
}

export type SceneSnapshotV1 = {
  version: 1
  savedAt: number
  camera: Camera2DSnapshot
  objects: GameObjectSnapshot[]
}
