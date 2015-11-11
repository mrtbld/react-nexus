export default function isExtensionOf(A, B) {
  if(A === B) {
    return true;
  }
  if(typeof A !== 'function') {
    return false;
  }
  const protoOfA = Reflect.getPrototypeOf(A);
  if(typeof B !== 'function') {
    return protoOfA === B;
  }
  return isExtensionOf(protoOfA, B);
}
