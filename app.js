const form = document.getElementById('registrationForm');
const home = document.getElementById('home');
const benefits = document.getElementById('vantagens');
const signup = document.getElementById('cadastro');
const result = document.getElementById('resultado');
let generatedQrText = '';
let generatedQrReady = false;
document.querySelectorAll('.show-pass').forEach(btn => btn.addEventListener('click', () => {
  const input = document.getElementById(btn.dataset.target);
  if (!input) return;
  input.type = input.type === 'password' ? 'text' : 'password';
  btn.textContent = input.type === 'password' ? 'Mostrar' : 'Ocultar';
}));
form.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!form.reportValidity()) return;
  const name = document.getElementById('fullName').value.trim();
  const email = document.getElementById('email').value.trim();
  const phone = document.getElementById('phone').value.trim();
  const submit = form.querySelector('[type="submit"]');
  submit.disabled = true; submit.textContent = 'Enviando cadastro…';
  try {
    const response = await fetch('/api/register', {
      method: 'POST', headers: {'Content-Type':'application/json'},
      body: JSON.stringify({name,email,phone,consent:document.getElementById('confirmData').checked})
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Não foi possível enviar o cadastro.');
    generatedQrText = JSON.stringify({tipo:'referencia-cadastro', codigo:data.id});
    home.classList.add('hidden'); benefits.classList.add('hidden'); signup.classList.add('hidden'); result.classList.remove('hidden');
    window.scrollTo({top:0,behavior:'smooth'});
    const qr = document.getElementById('qrcode'); qr.innerHTML = '';
    if (window.QRCode) {
      new QRCode(qr, {text:generatedQrText,width:220,height:220,colorDark:'#19151a',colorLight:'#ffffff',correctLevel:QRCode.CorrectLevel.M});
      generatedQrReady = true;
    } else {
      qr.textContent = 'Cadastro recebido. Código: ' + data.id;
      generatedQrReady = false;
    }
    const title = result.querySelector('.section-kicker');
    if(title) title.textContent = 'CADASTRO RECEBIDO';
    const p = result.querySelector('.muted');
    if(p) p.textContent = 'Seu cadastro foi enviado. Guarde o código de referência; não contém senhas ou dados pessoais completos.';
    const status = document.getElementById('shareStatus');
    if(status) status.textContent = 'Código de referência: ' + data.id;
  } catch(err) {
    alert(err.message + ' Confira se o backend Cloudflare foi configurado.');
  } finally {
    submit.disabled = false; submit.innerHTML = 'Concluir cadastro <span>→</span>';
  }
});
function getQrCanvas() {
  const qr = document.getElementById('qrcode');
  const canvas = qr.querySelector('canvas');
  if (canvas) return canvas;
  const img = qr.querySelector('img');
  if (img && img.complete) {
    const c=document.createElement('canvas'); c.width=img.naturalWidth; c.height=img.naturalHeight;
    c.getContext('2d').drawImage(img,0,0); return c;
  }
  return null;
}
document.getElementById('saveQr').addEventListener('click', () => {
  const canvas = getQrCanvas();
  if (!canvas) { alert('O QR Code ainda não está pronto.'); return; }
  const a=document.createElement('a'); a.download='referencia-cadastro.png'; a.href=canvas.toDataURL('image/png'); a.click();
});
document.getElementById('shareQr').addEventListener('click', async () => {
  const status = document.getElementById('shareStatus');
  const canvas = getQrCanvas();
  if (!canvas || !generatedQrReady) { status.textContent='O código de referência está disponível na tela.'; return; }
  try {
    const blob = await new Promise(resolve => canvas.toBlob(resolve,'image/png'));
    const file = new File([blob], 'referencia-cadastro.png', {type:'image/png'});
    if (navigator.canShare && navigator.canShare({files:[file]}) && navigator.share) {
      await navigator.share({title:'Código de referência do cadastro',text:'Código de referência. Não contém senhas.',files:[file]});
      status.textContent='Confira o destinatário antes de enviar.';
    } else {
      const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='referencia-cadastro.png'; a.click();
      status.textContent='Imagem salva. Compartilhe apenas com um destinatário confirmado.';
    }
  } catch(err) {
    status.textContent = err && err.name === 'AbortError' ? 'Compartilhamento cancelado.' : 'Salve a imagem e compartilhe manualmente.';
  }
});
document.getElementById('restart').addEventListener('click', () => {
  form.reset(); document.getElementById('qrcode').innerHTML=''; generatedQrText=''; generatedQrReady=false;
  result.classList.add('hidden'); home.classList.remove('hidden'); benefits.classList.remove('hidden'); signup.classList.remove('hidden');
  window.scrollTo({top:0,behavior:'smooth'});
});
