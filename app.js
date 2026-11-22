import {validate} from './src/index.js';
import {validateBatchRedacted,batchSummary,auditBatchInput,redactedBatchCsv,batchAuditCsv} from './src/batch.js';
const $=id=>document.getElementById(id);
let lastAudit=null;
let lastRedacted=null;
const notes={
  id:{placeholder:'e.g. 000000000',desc:'Israeli ID numbers may contain up to nine digits; leading zeroes are supported.',scope:'The ID checksum flags many common typing errors. A valid checksum does not prove that a number was issued or belongs to anyone.'},
  iban:{placeholder:'IL followed by 21 digits',desc:'Israeli IBAN: IL, two check digits, three-digit bank and branch codes, and a 13-digit account field.',scope:'The IBAN mod-97 checksum validates structure; it cannot establish that a bank or account exists, is active or belongs to a particular person.'},
  mobile:{placeholder:'05X-XXXXXXX or +9725X…',desc:'Basic 10-digit cellular format, optionally with the +972 or 00972 country prefix.',scope:'A mobile format check cannot prove that a number is assigned, reachable, or owned by a person.'},
  phone:{placeholder:'02-XXXXXXX, 05X-XXXXXXX…',desc:'Basic landline, cellular and 07X format checks; does not check number allocation.',scope:'Phone formatting checks do not verify allocation, carrier status, porting, reachability or active service.'},
  landline:{placeholder:'02-1234567 or +972-2-1234567',desc:'Fixed-line numbering shape: 02, 03, 04, 08 or 09 and seven further digits. Mobile 05 and 07 ranges are excluded.',scope:'This is a narrow fixed-line format check only. It does not verify allocation, actual line type, routing, portability or reachability.'},
  postal:{placeholder:'Seven-digit postal code',desc:'Modern seven-digit Israeli postal-code shape; it does not verify a physical address.',scope:'Seven digits are a structural format, not proof that the code exists or matches a particular street or building.'},
};
function resultDetail(name,value){
  const row=document.createElement('div');row.className='detail-row';
  const label=document.createElement('span');label.textContent=name;
  const val=document.createElement('code');val.textContent=value;
  row.append(label,val);return row;
}
function currentMode(){return document.querySelector('input[name="check-mode"]:checked')?.value||'single';}
function empty(){
  lastAudit=null;
  lastRedacted=null;
  $('batch-export-status').textContent='';
  $('download-redacted').disabled=true;
  $('download-audit-csv').disabled=true;
  $('batch-audit-actions').hidden=true;
  $('download-audit').disabled=true;
  $('batch-results').hidden=true;
  $('batch-results').replaceChildren();
  $('result').hidden=false;
  $('result').className='result-empty';$('result').replaceChildren();
  const icon=document.createElement('div');icon.className='empty-icon';icon.textContent='▤';
  const h=document.createElement('h3');h.textContent='Nothing checked yet';
  const p=document.createElement('p');p.textContent='Enter an example value and choose Check.';
  $('result').append(icon,h,p);
}
function render(){
  if(currentMode()==='batch'){renderBatch();return;}
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
  if(outcome.normalized && $('show-sensitive').checked)
    node.append(resultDetail('Normalized value',outcome.normalized));
  if(!outcome.valid)node.append(resultDetail('Reason',outcome.reason||'invalid'));
  if(kind==='iban'&&outcome.normalized&&$('show-sensitive').checked){
    node.append(resultDetail('Bank field',outcome.bankCode));
    node.append(resultDetail('Branch field',outcome.branchCode));
    node.append(resultDetail('Account field',outcome.accountNumber));
  }
}
function renderBatch(){
  const pane=$('batch-results');
  pane.replaceChildren();
  try{
    const data=validateBatchRedacted($('batch-entry').value,$('kind').value);
    const summary=batchSummary(data);
    // A separate direct counts-only export avoids retaining identifier-bearing rows.
    lastAudit=auditBatchInput($('batch-entry').value,$('kind').value);
    lastRedacted=data;
    const heading=document.createElement('h3');
    heading.textContent='Batch results: '+summary.passed+' passed, '+summary.failed+
      ' did not pass (out of '+summary.total+').';
    const caution=document.createElement('p');
    caution.textContent='Results describe only format or checksum plausibility; they do not verify issuance, identity or ownership.';
    const table=document.createElement('table');table.className='bulk-table';
    const head=document.createElement('thead');
    const headerRow=document.createElement('tr');
    for(const label of ['Input line','Status','Reason']){
      const cell=document.createElement('th');cell.scope='col';cell.textContent=label;headerRow.append(cell);
    }
    head.append(headerRow);table.append(head);
    const body=document.createElement('tbody');
    const invalidOnly=$('invalid-only').checked;
    const visibleRows=invalidOnly?data.rows.filter(row=>!row.valid):data.rows;
    if(invalidOnly){
      const filterNotice=document.createElement('p');
      filterNotice.textContent='Showing '+visibleRows.length+' failing line(s) of '+
        data.total+' checked. Summary and exports still include every checked line.';
      pane.append(filterNotice);
    }
    if(!visibleRows.length){
      const tr=document.createElement('tr');
      const cell=document.createElement('td');
      cell.colSpan=3;
      cell.textContent='No failing lines in this batch.';
      tr.append(cell);body.append(tr);
    }
    for(const row of visibleRows){
      const tr=document.createElement('tr');
      for(const [index,value] of [String(row.line),row.valid?'Passes format/checksum':'Does not pass',row.reason||'—'].entries()){
        const cell=document.createElement('td');
        cell.textContent=value;
        if(index===1)cell.className=row.valid?'bulk-valid':'bulk-invalid';
        tr.append(cell);
      }
      body.append(tr);
    }
    table.append(body);
    // Show the direct, counts-only audit in the browser. Reason strings are
    // restricted to the library's stable reason-code vocabulary and written
    // using textContent; the input values never enter this panel.
    const breakdown=document.createElement('details');
    breakdown.className='batch-reason-breakdown';
    const summaryLabel=document.createElement('summary');
    summaryLabel.textContent='Failure reasons ('+summary.failed+' invalid of '+summary.total+' checked)';
    breakdown.append(summaryLabel);
    if(lastAudit.invalidReasons.length){
      const list=document.createElement('ul');
      for(const item of lastAudit.invalidReasons){
        const line=document.createElement('li');
        line.textContent=item.reason+': '+item.count;
        list.append(line);
      }
      breakdown.append(list);
    }else{
      const emptyReasons=document.createElement('p');
      emptyReasons.textContent='No invalid values in this batch.';
      breakdown.append(emptyReasons);
    }
    pane.append(heading,caution,breakdown,table);
    $('result').hidden=true;
    pane.hidden=false;
    $('batch-audit-actions').hidden=false;
    $('download-audit').disabled=false;
    $('download-audit-csv').disabled=false;
    $('download-redacted').disabled=false;
  }catch(error){
    empty();
    $('result').replaceChildren();
    const text=document.createElement('p');
    text.className='error-text';
    text.textContent=error.message;
    $('result').append(text);
  }
}
$('kind').addEventListener('change',()=>{
  const kind=$('kind').value;
  $('entry').value='';
  $('batch-entry').value='';
  $('show-sensitive').checked=false;
  $('invalid-only').checked=false;
  $('entry').placeholder=notes[kind].placeholder;
  $('field-note').textContent=notes[kind].desc;
  $('scope').textContent=notes[kind].scope;
  empty();
});
for(const control of document.querySelectorAll('input[name="check-mode"]')){
  control.addEventListener('change',()=>{
    const batch=currentMode()==='batch';
    $('single-form').hidden=batch;
    $('batch-form').hidden=!batch;
    $('show-sensitive').checked=false;
    empty();
  });
}
$('run').addEventListener('click',render);
$('show-sensitive').addEventListener('change',()=>{
  if(currentMode()==='single' && $('entry').value.trim())render();
});
$('entry').addEventListener('keydown',event=>{
  if(event.key==='Enter'){event.preventDefault();render();}
});
$('batch-entry').addEventListener('input',empty);
$('invalid-only').addEventListener('change',()=>{
  // Render only redacted row metadata; never rebuild the full-value result.
  if(currentMode()==='batch'&&lastRedacted)renderBatch();
});
$('entry').addEventListener('input',()=>{
  // Disclosure is specific to the current result, never to future values.
  $('show-sensitive').checked=false;
  $('result').className='result-empty';empty();
});
$('clear').addEventListener('click',()=>{
  $('entry').value='';
  $('batch-entry').value='';
  $('show-sensitive').checked=false;
  $('invalid-only').checked=false;
  empty();(currentMode()==='batch'?$('batch-entry'):$('entry')).focus();
});


$('download-audit').addEventListener('click',()=>{
  if(!lastAudit)return;
  const blob=new Blob([JSON.stringify(lastAudit,null,2)+'\n'],{type:'application/json;charset=utf-8'});
  const url=URL.createObjectURL(blob);
  const link=document.createElement('a');
  link.href=url;
  link.download='validation-audit-counts.json';
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
});

$('download-audit-csv').addEventListener('click',()=>{
  if(!lastAudit || $('download-audit-csv').disabled)return;
  try{
    const csv=batchAuditCsv(lastAudit);
    const blob=new Blob([csv],{type:'text/csv;charset=utf-8'});
    const url=URL.createObjectURL(blob);
    const link=document.createElement('a');
    link.href=url;link.download='validation-audit-counts.csv';
    document.body.append(link);link.click();link.remove();
    setTimeout(()=>URL.revokeObjectURL(url),1000);
    $('batch-export-status').textContent='Counts-only CSV downloaded: no identifiers or input line numbers included.';
  }catch{
    $('download-audit-csv').disabled=true;
    $('batch-export-status').textContent='Counts-only CSV export failed. Re-run the batch check before retrying.';
  }
});
$('download-redacted').addEventListener('click',()=>{
  if(!lastRedacted)return;
  try{
    const csv=redactedBatchCsv(lastRedacted);
    const blob=new Blob([csv],{type:'text/csv;charset=utf-8'});
    const url=URL.createObjectURL(blob);
    const link=document.createElement('a');
    link.href=url;
    link.download='validation-line-results-redacted.csv';
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(()=>URL.revokeObjectURL(url),1000);
  }catch(error){
    $('download-redacted').disabled=true;
    // Do not throw a second exception from an undefined error handler.
    // Keep the entered identifiers out of the diagnostic display.
    $('batch-export-status').textContent='Redacted CSV export failed. Re-run the batch check before retrying.';
  }
});
