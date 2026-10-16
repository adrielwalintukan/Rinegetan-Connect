/** Shared backdrop: bottom sheet on phones, centered dialog from sm up with full edge-to-edge blur. */
export const MODAL_BACKDROP =
  "fixed inset-0 z-[100] flex items-end justify-center bg-navy/60 backdrop-blur-md sm:items-center sm:p-4 [&>*]:max-h-[92vh] [&>*]:overflow-y-auto [&>*]:rounded-b-none sm:[&>*]:rounded-b-2xl";

export { Modal } from "./ModalDialog";
export type { ModalProps } from "./ModalDialog";
