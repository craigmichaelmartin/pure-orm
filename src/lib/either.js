/* eslint-disable no-unused-vars, no-empty-function */

const Right = x => ({
  map: f => Right(f(x)),
  tryfix: f => Right(x),
  mapRespective: (f, g) => Right(g(x)),
  fold: (f, g) => g(x),
  val: () => x,
  isRight: true,
  inspect: () => `Right(${x})`
});

const Left = x => ({
  map: f => Left(x),
  tryfix: f => f(x),
  mapRespective: (f, g) => Left(f(x)),
  fold: (f, g) => f(x),
  val: () => {
    throw x;
  },
  isLeft: true,
  inspect: () => `Left(${x})`
});

const fold = (f, g) => (lor) => f && g ? lor.fold(f, g) : lor.fold(() => {}, f);

module.exports = {
  Right,
  Left,
  fold
};
