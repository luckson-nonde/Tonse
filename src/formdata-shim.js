console.log('FormData shim loaded');
export const FormData = window.FormData;
export const formDataToBlob = () => { throw new Error('formDataToBlob not supported in shim'); };
export default window.FormData;
