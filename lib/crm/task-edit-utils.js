/** @param {'todo' | 'doing' | 'review' | 'done' | 'blocked' | 'cancelled'} status */
export function taskStatusPatch(status) {
  return { status };
}
