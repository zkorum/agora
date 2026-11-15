export interface FixtureStateView<T> {
  value: T;
  set: (next: T) => void;
}
