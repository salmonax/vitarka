const { entries, assign, keys } = Object
/*
  Reverses the keys and values in an object.
  Assumes that the object values are keys.
 */
export const reverseHash =
  o => entries(o).reduce((a, n) => assign(a, { [n[1]]: n[0] }), {})

/*
  Squashes a value at second-level depth into the top level.
  Assumes the top-level values are objects.
 */
export const squash =
  (o, s) => keys(o).reduce((a, n) => assign(a, { [n]: o[n][s] }),{})
