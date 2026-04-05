export const Request = window.Request;
export const Response = window.Response;
export const Headers = window.Headers;
export const FormData = window.FormData;
export const Blob = window.Blob;
export const File = window.File;

export const FetchError = Error;
export const AbortError = Error;
export const isRedirect = () => false;

export const fileFromSync = () => { throw new Error('fileFromSync not supported in browser'); };
export const fileFrom = () => { throw new Error('fileFrom not supported in browser'); };
export const blobFromSync = () => { throw new Error('blobFromSync not supported in browser'); };
export const blobFrom = () => { throw new Error('blobFrom not supported in browser'); };

export default window.fetch.bind(window);
