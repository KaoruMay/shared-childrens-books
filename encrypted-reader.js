const lockedBook = {title:'注音大不同',author:'林郁珊'};
let privateUrls = [];
function clearPrivateBook() {
  privateUrls.forEach(url => URL.revokeObjectURL(url));
  privateUrls = [];
}
async function unlockBook(password) {
  const response = await fetch('assets/zhuyin-different.enc.json');
  if (!response.ok) throw new Error('network');
  const data = await response.json();
  const decode = value => Uint8Array.from(atob(value), char => char.charCodeAt(0));
  const material = await crypto.subtle.importKey('raw',new TextEncoder().encode(password),'PBKDF2',false,['deriveKey']);
  const key = await crypto.subtle.deriveKey({name:'PBKDF2',salt:decode(data.salt),iterations:600000,hash:'SHA-256'},material,{name:'AES-GCM',length:256},false,['decrypt']);
  const plaintext = await crypto.subtle.decrypt({name:'AES-GCM',iv:decode(data.iv)},key,decode(data.ciphertext));
  const pages = JSON.parse(new TextDecoder().decode(plaintext));
  clearPrivateBook();
  const result = pages.map((page,index) => {
    const src = URL.createObjectURL(new Blob([decode(page.image)],{type:'image/jpeg'}));
    privateUrls.push(src);
    return {src,label:`第 ${index+1} 頁`};
  });
  return {...lockedBook,pages:result,originals:[]};
}
