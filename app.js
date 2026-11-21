import {validate} from './src/index.js';
const $=id=>document.getElementById(id);
const notes={
  id:{placeholder:'e.g. 000000000',desc:'Israeli ID numbers may contain up to nine digits; leading zeroes are supported.',scope:'The ID checksum flags many common typing errors. A valid checksum does not prove that a number was issued or belongs to anyone.'},
  iban:{placeholder:'IL followed by 21 digits',desc:'Israeli IBAN: IL, two check digits, three-digit bank and branch codes, and a 13-digit account field.',scope:'The IBAN mod-97 checksum validates structure; it cannot establish that a bank or account exists, is active or belongs to a particular person.'},
  mobile:{placeholder:'05X-XXXXXXX or +9725X…',desc:'Basic 10-digit cellular format, optionally with the +972 or 00972 country prefix.',scope:'A mobile format check cannot prove that a number is assigned, reachable, or owned by a person.'},
  phone:{placeholder:'02-XXXXXXX, 05X-XXXXXXX…',desc:'Basic landline, cellular and 07X format checks; does not check number allocation.',scope:'Phone formatting checks do not verify allocation, carrier status, porting, reachability or active service.'},
  postal:{placeholder:'Seven-digit postal code',desc:'Modern seven-digit Israeli postal-code shape; it does not verify a physical address.',scope:'Seven digits are a structural format, not proof that the code exists or matches a particular street or building.'},
};
function resultDetail(name,value){
  const row=document.createElement('div');row.className='detail-row';
  const label=document.createElement('span');label.textContent=name;
  const val=document.createElement('code');val.textContent=value;
  row.append(label,val);return row;
}
function empty(){
  $('result').className='result-empty';$('result').replaceChildren();
  const icon=document.createElement('div');icon.className='empty-icon';icon.textContent='▤';
  const h=document.createElement('h3');h.textContent='Nothing checked yet';
  const p=document.createElement('p');p.textContent='Enter an example value and choose Check.';
  $('result').append(icon,h,p);
}
function render(){
  const raw=$('entry').value,kind=$('kind').value;
  if(!raw.trim()){empty();return;}
  const outcome=validate(raw,kind);
  const node=$('result');node.replaceChildren();node.className='result-block';
  const tag=document.createElement('span');tag.className='result-tag '+(outcome.valid?'valid':'invalid');
  tag.textContent=outcome.valid?'✓ Passes format/checksum':'× Does not pass';
  const title=document.createElement('h3');
  title.textContent=outcome.valid?'Format or checksum matched.':'Value did not match the selected check.';
  const caveat=document.createElement('p');caveat.textContent=notes[kind].scope;
  node.append(tag,title,caveat);
  if(outcome.normalized)node.append(resultDetail('Normalized value',outcome.normalized));
  if(!outcome.valid)node.append(resultDetail('Reason',outcome.reason||'invalid'));
  if(kind==='iban'&&outcome.normalized){
    node.append(resultDetail('Bank field',outcome.bankCode));
    node.append(resultDetail('Branch field',outcome.branchCode));
    node.append(resultDetail('Account field',outcome.accountNumber));
  }
}
$('kind').addEventListener('change',()=>{
  const kind=$('kind').value;
  $('entry').value='';
  $('entry').placeholder=notes[kind].placeholder;
  $('field-note').textContent=notes[kind].desc;
  $('scope').textContent=notes[kind].scope;
  empty();
});
$('run').addEventListener('click',render);
$('entry').addEventListener('keydown',event=>{
  if(event.key==='Enter'){event.preventDefault();render();}
});
$('entry').addEventListener('input',()=>{
  $('result').className='result-empty';empty();
});
$('clear').addEventListener('click',()=>{
  $('entry').value='';empty();$('entry').focus();
});
