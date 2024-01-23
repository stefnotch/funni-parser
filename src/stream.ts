import { type Option, Ok, Err, Result, None } from "./result";

// Write a stream class with the following API:
// - constructor(stream: T[])
// - peek(): Option<T>
// - next(): Option<T>

export class Stream<T> {
  private _current = 0;

  constructor(private _stream: T[]) {}

  peek(): Option<T> {
    if (this._current < this._stream.length) {
      return Ok(this._stream[this._current]);
    }
    return None();
  }

  next(): Option<T> {
    if (this._current < this._stream.length) {
      return Ok(this._stream[this._current++]);
    }
    return None();
  }
}
