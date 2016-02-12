import entriesToObject from '../util/entriesToObject';

function headersToObject(headers) {
  if(typeof headers.entries === 'function') {
    return entriesToObject(headers.entries());
  }
  if(typeof headers.raw === 'function') {
    return headers.raw();
  }
  if(typeof headers.forEach === 'function') {
    const o = {};
    headers.forEach((v, k) => o[k] = v);
    return o;
  }
  throw new Error('Could not find a suitable interface for converting headers to object');
}

export default headersToObject;