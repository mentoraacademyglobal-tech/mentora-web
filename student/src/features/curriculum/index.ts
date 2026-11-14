// Public surface of the curriculum feature. Other code imports from here only.
export { default as OutlineTree } from "./components/OutlineTree";
export { importOutline, addNode, deleteNode } from "./actions";
export { listVersionsWithCounts, getVersion, listNodes } from "./queries";
export { parseOutline, typeForDepth, depthMap } from "./syllabus";
export type { NodeRow, VersionSummary, VersionDetail, SubjectInfo } from "./types";
