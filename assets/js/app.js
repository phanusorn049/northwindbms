const API=new URL('api/v1',document.baseURI).pathname.replace(/\/$/,'');
const menu=[
  {label:'ภาพรวม',icon:'bi-grid-1x2',page:'dashboard'},
  {label:'สินค้า',icon:'bi-box-seam',page:'products'},
  {label:'หมวดหมู่สินค้า',icon:'bi-tags',page:'categories'},
  {label:'คำสั่งซื้อ',icon:'bi-receipt',page:'orders'},
  {label:'ลูกค้า',icon:'bi-people',page:'customers',group:'ข้อมูลธุรกิจ'},
  {label:'ผู้จัดจำหน่าย',icon:'bi-truck',page:'suppliers'},
  {label:'พนักงาน',icon:'bi-person-badge',page:'employees'},
  {label:'บริษัทขนส่ง',icon:'bi-box2',page:'shippers'},
  {label:'รายงาน',icon:'bi-bar-chart-line',page:'reports',group:'วิเคราะห์ข้อมูล'},
  {label:'API Documentation',icon:'bi-braces',page:'api-docs'}
];
const resourceMeta={
 products:{title:'สินค้า',singular:'สินค้า',icon:'bi-box-seam',endpoint:'products',key:'product_id',search:'product_name',columns:[['product_id','รหัส'],['product_name','ชื่อสินค้า'],['category_name','หมวดหมู่'],['supplier_name','ผู้จัดจำหน่าย'],['unit_price','ราคา']],fields:[['product_name','ชื่อสินค้า','text',true],['supplier_id','ผู้จัดจำหน่าย','select:suppliers',true],['category_id','หมวดหมู่','select:categories',true],['quantity_per_unit','จำนวนต่อหน่วย','text',true],['unit_price','ราคาต่อหน่วย','number',true]]},
 categories:{title:'หมวดหมู่สินค้า',singular:'หมวดหมู่',icon:'bi-tags',endpoint:'categories',key:'category_id',search:'category_name',columns:[['category_id','รหัส'],['category_name','ชื่อหมวดหมู่'],['description','รายละเอียด']],fields:[['category_name','ชื่อหมวดหมู่','text',true],['description','รายละเอียด','text']]},
 customers:{title:'ลูกค้า',singular:'ลูกค้า',icon:'bi-people',endpoint:'customers',key:'customer_id',search:'company_name',columns:[['customer_id','รหัส'],['company_name','บริษัท'],['contact_name','ผู้ติดต่อ'],['city','เมือง'],['country','ประเทศ']],fields:[['company_name','ชื่อบริษัท','text',true],['contact_name','ชื่อผู้ติดต่อ','text',true],['address','ที่อยู่','text',true],['city','เมือง','text',true],['postal_code','รหัสไปรษณีย์','text',true],['country','ประเทศ','text',true]]},
 suppliers:{title:'ผู้จัดจำหน่าย',singular:'ผู้จัดจำหน่าย',icon:'bi-truck',endpoint:'suppliers',key:'supplier_id',search:'company_name',columns:[['supplier_id','รหัส'],['company_name','บริษัท'],['contact_name','ผู้ติดต่อ'],['city','เมือง'],['country','ประเทศ'],['phone','โทรศัพท์']],fields:[['company_name','ชื่อบริษัท','text',true],['contact_name','ชื่อผู้ติดต่อ','text',true],['address','ที่อยู่','text',true],['city','เมือง','text',true],['postal_code','รหัสไปรษณีย์','text',true],['country','ประเทศ','text',true],['phone','โทรศัพท์','text',true]]},
 employees:{title:'พนักงาน',singular:'พนักงาน',icon:'bi-person-badge',endpoint:'employees',key:'employee_id',search:'last_name',columns:[['employee_id','รหัส'],['first_name','ชื่อ'],['last_name','นามสกุล'],['notes','หมายเหตุ']],fields:[['first_name','ชื่อ','text',true],['last_name','นามสกุล','text',true],['notes','หมายเหตุ','text']]},
 shippers:{title:'บริษัทขนส่ง',singular:'บริษัทขนส่ง',icon:'bi-box2',endpoint:'shippers',key:'shipper_id',search:'company_name',columns:[['shipper_id','รหัส'],['company_name','บริษัทขนส่ง'],['phone','โทรศัพท์']],fields:[['company_name','ชื่อบริษัท','text',true],['phone','โทรศัพท์','text']]}
};
const pageTitles={dashboard:'ภาพรวมธุรกิจ',products:'สินค้า',categories:'หมวดหมู่สินค้า',orders:'คำสั่งซื้อ',customers:'ลูกค้า',suppliers:'ผู้จัดจำหน่าย',employees:'พนักงาน',shippers:'บริษัทขนส่ง',reports:'รายงานธุรกิจ','api-docs':'API Documentation'};
let token=localStorage.getItem('northwind_token')||'',currentUser=null,activePage='dashboard',searchTerm='',resourcePage=1,resourceSort='desc',orderPage=1,orderSort='desc',orderSearch='',chartInstances=[];
const $=(selector,root=document)=>root.querySelector(selector);
const escapeHtml=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const money=value=>'฿'+Number(value||0).toLocaleString('th-TH',{minimumFractionDigits:2,maximumFractionDigits:2});
function toast(message,type='success'){const el=document.createElement('div');el.className=`toast align-items-center text-bg-${type} border-0`;el.role='status';el.innerHTML=`<div class="d-flex"><div class="toast-body">${escapeHtml(message)}</div><button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button></div>`;$('#toast-container').append(el);const toastInstance=new bootstrap.Toast(el,{delay:3500});toastInstance.show();el.addEventListener('hidden.bs.toast',()=>el.remove())}
async function api(path,options={}){const headers={'Content-Type':'application/json',...(options.headers||{})};if(token)headers.Authorization=`Bearer ${token}`;const response=await fetch(API+path,{...options,headers});const data=await response.json().catch(()=>({status:false,message:'Server returned an invalid response.'}));if(response.status===401&&token){token='';localStorage.removeItem('northwind_token');currentUser=null;renderLogin();throw new Error(data.message||'กรุณาเข้าสู่ระบบอีกครั้ง')}if(!response.ok||data.status===false)throw new Error(data.message||`Request failed (${response.status})`);return data}
function setToken(value){token=value;localStorage.setItem('northwind_token',value)}
function renderLogin(setup=false){
 chartInstances.forEach(chart=>chart.destroy());
 const title=setup?'สร้างผู้ดูแลระบบ':'เข้าสู่ระบบ';
 const description=setup
  ?'สร้างบัญชีผู้ดูแลระบบคนแรก บัญชีนี้สามารถจัดการข้อมูลทั้งหมดในระบบได้'
  :'เข้าสู่ระบบเพื่อจัดการข้อมูล Northwind';
 const endpoint=setup?'/auth/setup':'/auth/login';
 $('#app').innerHTML=`<div class="login-shell"><section class="login-art"><div class="login-brand"><span class="brand-mark me-2 d-inline-grid align-middle">NW</span> NORTHWIND <span class="fw-normal opacity-75">BMS</span></div><div class="login-copy"><div class="eyebrow text-info">BUSINESS MANAGEMENT SYSTEM</div><h1>บริหารธุรกิจ<br>อย่างเป็นระบบ</h1><p>จัดการสินค้า คำสั่งซื้อ ลูกค้า และข้อมูลธุรกิจ Northwind ในที่เดียว</p><div class="d-flex gap-3 mt-4 text-white-50 small"><span><i class="bi bi-shield-check me-1"></i>ปลอดภัย</span><span><i class="bi bi-key me-1"></i>สำหรับผู้ดูแลระบบ</span></div></div><small class="text-white-50">Northwind Business Management</small></section><section class="login-form"><div class="login-card"><div class="login-logo"><span class="brand-mark">NW</span><div><strong>Northwind BMS</strong><small>ระบบจัดการธุรกิจ</small></div></div><div class="eyebrow">${setup?'เริ่มต้นใช้งาน':'ยินดีต้อนรับกลับ'}</div><h2>${title}</h2><p class="text-secondary mb-4">${description}</p><form id="login-form"><div id="login-error"></div>${setup?'<div class="mb-3"><label class="form-label small fw-semibold">ชื่อที่แสดง</label><input name="display_name" class="form-control" required autocomplete="name" maxlength="100"></div>':''}<div class="mb-3"><label class="form-label small fw-semibold">ชื่อผู้ใช้</label><input name="username" class="form-control" required autocomplete="username" minlength="3" maxlength="50" pattern="[A-Za-z0-9_.-]+"></div><div class="mb-4"><label class="form-label small fw-semibold">รหัสผ่าน${setup?' (อย่างน้อย 10 ตัวอักษร)':''}</label><input name="password" type="password" class="form-control" required autocomplete="${setup?'new-password':'current-password'}" ${setup?'minlength="10"':''}></div><button type="submit" class="btn btn-primary w-100 py-2">${title} <i class="bi bi-arrow-right ms-1"></i></button></form><div class="small text-secondary mt-4 text-center">${setup?'บัญชีนี้มีสิทธิ์จัดการระบบทั้งหมด การสร้างผู้ดูแลระบบครั้งแรกทำได้เพียงครั้งเดียว':'หากยังไม่มีบัญชีผู้ดูแลระบบ ระบบจะแสดงหน้าสร้างบัญชีครั้งแรก'}</div></div></section></div>`;
 $('#login-form').addEventListener('submit',async event=>{
  event.preventDefault();
  const form=event.currentTarget,button=$('button[type="submit"]',form);
  button.disabled=true;
  const values=Object.fromEntries(new FormData(form));
  try{
   const result=await api(endpoint,{method:'POST',body:JSON.stringify(values)});
   setToken(result.data.token);
   currentUser=result.data.user;
   renderShell();
  }catch(error){
   $('#login-error').innerHTML=`<div class="error-box mb-3">${escapeHtml(error.message)}</div>`;
  }finally{button.disabled=false}
 });
}
function renderShell(){
 chartInstances.forEach(chart=>chart.destroy());
 activePage=location.hash.slice(1).split('/')[0]||'dashboard';
 if(!pageTitles[activePage])activePage='dashboard';
 const nav=menu.map(item=>`${item.group?`<div class="nav-label">${item.group}</div>`:''}<button type="button" data-page="${item.page}" class="${item.page===activePage?'active':''}"><i class="bi ${item.icon}"></i><span>${item.label}</span></button>`).join('');
 const roleLabel='ผู้ดูแลระบบ';
 $('#app').innerHTML=`<div class="shell"><aside class="sidebar" id="sidebar"><div class="brand"><div class="brand-mark">NW</div><div><strong>NORTHWIND BMS</strong><small>ระบบจัดการธุรกิจ</small></div></div><div class="nav-label">เมนูหลัก</div><nav class="side-nav">${nav}</nav><div class="px-2 mb-3"><button type="button" class="btn btn-outline-primary btn-sm w-100" id="create-account"><i class="bi bi-person-plus me-1"></i>สร้างบัญชีผู้ดูแล</button></div><div class="sidebar-bottom"><div class="avatar">${escapeHtml((currentUser?.display_name||'A').charAt(0))}</div><div class="user-meta"><strong>${escapeHtml(currentUser?.display_name||'ผู้ดูแลระบบ')}</strong><small>${roleLabel}</small></div><button type="button" class="icon-btn" id="logout" title="ออกจากระบบ" aria-label="ออกจากระบบ"><i class="bi bi-box-arrow-right"></i></button></div></aside><section class="main-area"><header class="topbar"><div class="d-flex align-items-center gap-3"><button type="button" class="icon-btn mobile-menu" id="mobile-menu" aria-label="เปิดเมนู"><i class="bi bi-list fs-5"></i></button><div class="breadcrumb mb-0">หน้าหลัก <i class="bi bi-chevron-right mx-1"></i> <strong>${pageTitles[activePage]}</strong></div></div><div class="topbar-right"><span class="viewer-badge"><i class="bi bi-shield-lock me-1"></i>${roleLabel}</span><span class="d-none d-sm-inline"><i class="bi bi-calendar3 me-1"></i>${new Intl.DateTimeFormat('th-TH',{dateStyle:'medium'}).format(new Date())}</span><span class="rounded-circle bg-success d-inline-block" style="width:7px;height:7px" title="เชื่อมต่อแล้ว"></span></div></header><main class="content" id="page-content"><div class="page-loading"><span class="spinner-border spinner-border-sm text-primary"></span></div></main></section></div>`;
 document.querySelectorAll('[data-page]').forEach(button=>button.addEventListener('click',()=>navigate(button.dataset.page)));
 $('#create-account').addEventListener('click',openUserRegistration);
 $('#logout').addEventListener('click',()=>{token='';currentUser=null;localStorage.removeItem('northwind_token');renderLogin()});
 $('#mobile-menu').addEventListener('click',()=>$('#sidebar').classList.toggle('open'));
 renderPage();
}
function openUserRegistration(){
 const modal=showModal('สร้างบัญชีผู้ดูแลระบบ',`<p class="small text-secondary">บัญชีใหม่จะมีสิทธิ์จัดการข้อมูลทั้งหมด เข้าถึงหน้านี้ได้เฉพาะหลังจากผู้ดูแลระบบเข้าสู่ระบบแล้ว</p><form id="user-registration-form"><div id="registration-error"></div><div class="form-field mb-3"><label>ชื่อที่แสดง *</label><input name="display_name" class="form-control" required maxlength="100" autocomplete="name"></div><div class="form-field mb-3"><label>ชื่อผู้ใช้ *</label><input name="username" class="form-control" required minlength="3" maxlength="50" pattern="[A-Za-z0-9_.-]+" autocomplete="username"></div><div class="form-field mb-3"><label>รหัสผ่าน * (อย่างน้อย 10 ตัวอักษร)</label><input name="password" class="form-control" type="password" required minlength="10" autocomplete="new-password"></div><div class="d-flex justify-content-end gap-2 mt-4"><button type="button" class="btn btn-light" data-bs-dismiss="modal">ยกเลิก</button><button type="submit" class="btn btn-primary">สร้างบัญชี</button></div></form>`);
 $('#user-registration-form').addEventListener('submit',async event=>{
  event.preventDefault();
  const form=event.currentTarget,button=$('button[type="submit"]',form);
  button.disabled=true;
  const values=Object.fromEntries(new FormData(form));
  try{
   await api('/auth/register',{method:'POST',body:JSON.stringify(values)});
   modal.hide();
   toast('สร้างบัญชีผู้ดูแลระบบเรียบร้อย');
  }catch(error){
   $('#registration-error').innerHTML=`<div class="error-box mb-3">${escapeHtml(error.message)}</div>`;
  }finally{button.disabled=false}
 });
}
function navigate(page){location.hash=page;activePage=page;searchTerm='';renderShell()}
async function renderPage(){const root=$('#page-content');try{if(activePage==='dashboard')await renderDashboard(root);else if(resourceMeta[activePage])await renderResource(root,activePage);else if(activePage==='orders')await renderOrders(root);else if(activePage==='reports')await renderReports(root);else if(activePage==='api-docs')renderApiDocs(root)}catch(error){root.innerHTML=`<div class="error-box">${escapeHtml(error.message)}</div>`}}
function heading(kicker,title,subtitle,button=''){return `<div class="page-heading"><div><div class="eyebrow">${kicker}</div><h1>${title}</h1><p>${subtitle}</p></div>${button}</div>`}
function stat(label,value,note,icon,tone){return `<article class="stat-card"><span class="stat-icon ${tone}"><i class="bi ${icon}"></i></span><div class="stat-label">${label}</div><div class="stat-value">${value}</div><div class="stat-note">${note}</div></article>`}
function tableHtml(columns,rows,resource){
 if(!rows.length)return'<div class="empty-state"><i class="bi bi-inbox"></i>ยังไม่มีข้อมูลในระบบ</div>';
 const normalizedColumns=columns.map(column=>Array.isArray(column)?{key:column[0],label:column[1]}:column);
 const canManage=resource&&resource!=='orders'&&currentUser?.role==='admin';
 return `<div class="table-responsive"><table class="table"><thead><tr>${normalizedColumns.map(column=>`<th>${column.label}</th>`).join('')}${resource==='orders'||canManage?`<th class="text-end">${resource==='orders'?'รายละเอียด':'จัดการ'}</th>`:''}</tr></thead><tbody>${rows.map(row=>`<tr>${normalizedColumns.map(column=>`<td>${column.money?money(row[column.key]):escapeHtml(row[column.key]??'—')}</td>`).join('')}${resource==='orders'?`<td class="text-end"><button type="button" class="btn btn-light btn-sm" data-order-detail="${row.order_id}">รายละเอียด <i class="bi bi-chevron-right"></i></button></td>`:canManage?`<td><div class="table-action"><button type="button" class="icon-btn text-primary" title="แก้ไข" aria-label="แก้ไข" data-edit="${resource}:${row[resourceMeta[resource].key]}"><i class="bi bi-pencil-square"></i></button><button type="button" class="icon-btn text-danger" title="ลบ" aria-label="ลบ" data-delete="${resource}:${row[resourceMeta[resource].key]}"><i class="bi bi-trash3"></i></button></div></td>`:''}</tr>`).join('')}</tbody></table></div>`;
}
async function renderResource(root,name){
 const meta=resourceMeta[name],limit=20;
 const query=new URLSearchParams({page:String(resourcePage),limit:String(limit),sort:resourceSort});
 if(searchTerm)query.set('search',searchTerm);
 const result=await api(`/${meta.endpoint}?${query}`);
 resourcePage=result.meta.page;
 const totalPages=Math.max(1,Math.ceil(result.meta.total/limit));
 const first=result.meta.total?((resourcePage-1)*limit)+1:0;
 const last=Math.min(resourcePage*limit,result.meta.total);
 root.innerHTML=heading('DATA MANAGEMENT',meta.title,`จัดการข้อมูล${meta.title} เพิ่ม แก้ไข และค้นหารายการในระบบ`,`<button class="btn btn-primary btn-sm px-3" id="add-record"><i class="bi bi-plus-lg me-1"></i>เพิ่ม${meta.singular}</button>`)+
 `<section class="card-panel"><div class="toolbar"><div class="d-flex align-items-center gap-2 flex-wrap"><div class="search-input"><i class="bi bi-search"></i><input id="resource-search" class="form-control form-control-sm" placeholder="ค้นหาด้วย ID หรือชื่อ..." value="${escapeHtml(searchTerm)}"></div><div class="btn-group btn-group-sm" role="group" aria-label="เรียงตาม ID"><button type="button" class="btn ${resourceSort==='asc'?'btn-primary':'btn-light'}" data-resource-sort="asc" title="เรียง ID จากน้อยไปมาก" aria-label="เรียง ID จากน้อยไปมาก"><i class="bi bi-arrow-up"></i></button><button type="button" class="btn ${resourceSort==='desc'?'btn-primary':'btn-light'}" data-resource-sort="desc" title="เรียง ID จากมากไปน้อย" aria-label="เรียง ID จากมากไปน้อย"><i class="bi bi-arrow-down"></i></button></div></div><div class="small text-secondary">${result.meta.total.toLocaleString()} รายการ</div></div>${tableHtml(meta.columns,result.data,name)}<div class="pagination-line"><span>แสดง ${first.toLocaleString()}–${last.toLocaleString()} จาก ${result.meta.total.toLocaleString()} รายการ</span><div class="d-flex align-items-center gap-2"><span>หน้า ${resourcePage} / ${totalPages}</span><button type="button" class="btn btn-light btn-sm" id="resource-prev" aria-label="หน้าก่อนหน้า" ${resourcePage<=1?'disabled':''}><i class="bi bi-chevron-left"></i></button><button type="button" class="btn btn-light btn-sm" id="resource-next" aria-label="หน้าถัดไป" ${resourcePage>=totalPages?'disabled':''}><i class="bi bi-chevron-right"></i></button></div></div></section>`;
 $('#resource-search').addEventListener('input',event=>{searchTerm=event.target.value;resourcePage=1;clearTimeout(window.searchTimer);window.searchTimer=setTimeout(()=>renderPage(),300)});
 document.querySelectorAll('[data-resource-sort]').forEach(button=>button.addEventListener('click',()=>{if(resourceSort!==button.dataset.resourceSort){resourceSort=button.dataset.resourceSort;resourcePage=1;renderPage()}}));
 $('#resource-prev').addEventListener('click',()=>{if(resourcePage>1){resourcePage--;renderPage()}});
 $('#resource-next').addEventListener('click',()=>{if(resourcePage<totalPages){resourcePage++;renderPage()}});
 $('#add-record').addEventListener('click',()=>openResourceModal(name));bindTableActions()
}
async function loadAllResourceRows(name){
 const meta=resourceMeta[name],limit=100,rows=[];
 let page=1,totalPages=1;
 do{
  const result=await api(`/${meta.endpoint}?page=${page}&limit=${limit}&sort=asc`);
  rows.push(...result.data);
  totalPages=Math.max(1,Math.ceil(result.meta.total/limit));
  page++;
 }while(page<=totalPages);
 return rows;
}
async function openResourceModal(name,id=null){
 const meta=resourceMeta[name];
 let record={};
 try{
  if(id!==null)record=(await api(`/${meta.endpoint}/${id}`)).data;
  const fields=await Promise.all(meta.fields.map(async([key,label,type,required])=>{
   const value=record[key]??'';
   let control;
   if(type.startsWith('select:')){
    const resourceName=type.slice('select:'.length),related=resourceMeta[resourceName];
    const rows=await loadAllResourceRows(resourceName);
    control=`<select class="form-select" name="${key}" ${required?'required':''}><option value="">เลือก${label}</option>${rows.map(row=>`<option value="${escapeHtml(row[related.key])}" ${String(row[related.key])===String(value)?'selected':''}>${escapeHtml(row[related.key])} - ${escapeHtml(row[related.search]||row.company_name||row.category_name||'')}</option>`).join('')}</select>`;
   }else{
    const inputType=type==='number'?'number':type==='date'?'date':'text';
    const maxLength=type==='text'?`maxlength="${key==='address'?'500':key==='notes'?'80':key==='description'?'30':key==='company_name'&&name==='customers'?'50':name==='suppliers'||name==='shippers'?30:50}"`:'';
    control=`<input class="form-control" name="${key}" type="${inputType}" value="${escapeHtml(value)}" ${inputType==='number'?'step="any"':''} ${maxLength} ${required?'required':''}>`;
   }
   return `<div class="form-field"><label>${label}${required?' *':''}</label>${control}</div>`;
  }));
  const modal=showModal(`${id===null?'เพิ่ม':'แก้ไข'}${meta.singular}`,`<form id="resource-form"><div id="resource-form-error"></div><div class="form-grid">${fields.join('')}</div><div class="d-flex justify-content-end gap-2 mt-4"><button type="button" class="btn btn-light" data-bs-dismiss="modal">ยกเลิก</button><button type="submit" class="btn btn-primary">${id===null?'เพิ่ม':'บันทึก'}</button></div></form>`);
  $('#resource-form').addEventListener('submit',async event=>{
   event.preventDefault();
   const form=event.currentTarget,button=$('button[type="submit"]',form);
   button.disabled=true;
   const data=Object.fromEntries(new FormData(form));
   for(const[key,value]of Object.entries(data)){
    const field=meta.fields.find(([fieldName])=>fieldName===key);
    if(field&&field[2]==='number')data[key]=value===''?null:Number(value);
    else if(field&&field[2].startsWith('select:'))data[key]=value===''?null:Number(value);
   }
   try{
    await api(`/${meta.endpoint}${id===null?'':`/${id}`}`,{method:id===null?'POST':'PUT',body:JSON.stringify(data)});
    modal.hide();
    toast(id===null?'เพิ่มข้อมูลเรียบร้อย':'บันทึกข้อมูลเรียบร้อย');
    renderPage();
   }catch(error){
    $('#resource-form-error').innerHTML=`<div class="error-box mb-3">${escapeHtml(error.message)}</div>`;
   }finally{button.disabled=false}
  });
 }catch(error){toast(error.message,'danger')}
}
function bindTableActions(){document.querySelectorAll('[data-edit]').forEach(button=>button.addEventListener('click',()=>{const[name,id]=button.dataset.edit.split(':');openResourceModal(name,Number(id))}));document.querySelectorAll('[data-delete]').forEach(button=>button.addEventListener('click',async()=>{const[name,id]=button.dataset.delete.split(':');const meta=resourceMeta[name];if(!confirm(`ยืนยันการลบ${meta.singular}รายการนี้?`))return;try{await api(`/${meta.endpoint}/${id}`,{method:'DELETE'});toast('ลบข้อมูลเรียบร้อย');renderPage()}catch(error){toast(error.message,'danger')}}));document.querySelectorAll('tr').forEach(row=>{const cell=$('td',row);if(cell&&cell.textContent.trim().startsWith('#'))row.style.cursor='pointer'})}
function showModal(title,content,size=''){const wrapper=document.createElement('div');wrapper.innerHTML=`<div class="modal fade" tabindex="-1"><div class="modal-dialog modal-dialog-centered ${size}"><div class="modal-content border-0 rounded-4"><div class="modal-header px-4 pt-4 border-0"><h5 class="modal-title fw-bold">${title}</h5><button type="button" class="btn-close" data-bs-dismiss="modal"></button></div><div class="modal-body px-4 pb-4">${content}</div></div></div></div>`;document.body.append(wrapper);const modal=new bootstrap.Modal($('.modal',wrapper));$('.modal',wrapper).addEventListener('hidden.bs.modal',()=>wrapper.remove());modal.show();return modal}
function downloadCsv(filename,rows){const csv=rows.map(row=>row.map(value=>`"${String(value??'').replace(/"/g,'""')}"`).join(',')).join('\r\n');const link=document.createElement('a');link.href=URL.createObjectURL(new Blob(['\ufeff'+csv],{type:'text/csv;charset=utf-8'}));link.download=filename;link.click();URL.revokeObjectURL(link.href)}
async function bootstrapApp(){const match=location.hash.slice(1).split('/')[0];if(match)activePage=match;if(token){try{currentUser=(await api('/auth/me')).data;renderShell();return}catch(error){token='';localStorage.removeItem('northwind_token')}}try{const status=await api('/auth/status');renderLogin(status.data.setup_required)}catch(error){$('#app').innerHTML=`<div class="container py-5"><div class="error-box">ไม่สามารถเชื่อมต่อระบบได้: ${escapeHtml(error.message)}<br>ตรวจสอบค่าฐานข้อมูลและ JWT_SECRET ใน config.php</div></div>`}}
window.addEventListener('hashchange',()=>{const page=location.hash.slice(1).split('/')[0];if(pageTitles[page]||resourceMeta[page])navigate(page)});bootstrapApp();

async function renderDashboard(root){
 const [report,orders]=await Promise.all([api('/reports/summary'),api('/orders?limit=5')]);
 const data=report.data.summary;
 root.innerHTML=heading('NORTHWIND OVERVIEW','ภาพรวมธุรกิจ','ข้อมูลจากฐานข้อมูล Northwind ')+
 `<div class="stats-grid">${stat('สินค้าทั้งหมด',data.products.toLocaleString(),'รายการสินค้า','bi-box-seam','tone-blue')}${stat('ลูกค้าทั้งหมด',data.customers.toLocaleString(),'บัญชีลูกค้า','bi-people','tone-green')}${stat('คำสั่งซื้อทั้งหมด',data.orders.toLocaleString(),'รายการคำสั่งซื้อ','bi-receipt','tone-purple')}${stat('ยอดขายโดยประมาณ',money(data.revenue),'คำนวณจากราคาปัจจุบันของสินค้า','bi-currency-dollar','tone-orange')}</div><div class="dashboard-grid"><section class="card-panel"><div class="card-title"><div><h2>แนวโน้มยอดขาย</h2><p>คำนวณจากวันที่ในฐานข้อมูลเดิม</p></div></div><div class="chart-wrap"><canvas id="sales-chart"></canvas></div></section><section class="card-panel"><div class="card-title"><div><h2>ข้อมูลสต็อก</h2></div></div><div class="empty-state py-4">ฐานข้อมูลเดิมไม่มีคอลัมน์จำนวนคงเหลือ จึงไม่สามารถรายงานสต็อกได้</div></section></div><section class="card-panel mt-3"><div class="card-title"><div><h2>คำสั่งซื้อล่าสุด</h2></div><button class="btn btn-light btn-sm" data-navigate="orders">ดูคำสั่งซื้อทั้งหมด</button></div>${tableHtml([{key:'order_id',label:'เลขที่'},{key:'company_name',label:'ลูกค้า'},{key:'order_date',label:'วันที่สั่งซื้อ'},{key:'total',label:'ยอดรวม',money:true}],orders.data,'orders')}</section>`;
 const sales=report.data.monthly_sales;const canvas=$('#sales-chart');
 chartInstances.push(new Chart(canvas,{type:'line',data:{labels:sales.map(row=>row.month),datasets:[{data:sales.map(row=>Number(row.revenue)),borderColor:'#356df3',backgroundColor:'rgba(53,109,243,.10)',fill:true,tension:.36,pointRadius:3}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}}}}));
 document.querySelectorAll('[data-navigate]').forEach(button=>button.addEventListener('click',()=>navigate(button.dataset.navigate)));
 document.querySelectorAll('[data-order-detail]').forEach(button=>button.addEventListener('click',()=>openOrderDetail(button.dataset.orderDetail)));
}

async function renderReports(root){
 const result=await api('/reports/summary');
 const {summary,monthly_sales:monthlySales,top_products:topProducts}=result.data;
 root.innerHTML=heading('BUSINESS ANALYTICS','รายงานธุรกิจ','สรุปยอดขายจากข้อมูลคำสั่งซื้อและราคาสินค้าปัจจุบัน',
  '<button type="button" class="btn btn-light btn-sm" id="export-report"><i class="bi bi-download me-1"></i>ส่งออกรายงาน CSV</button>')+
  `<div class="stats-grid">${stat('สินค้าทั้งหมด',Number(summary.products).toLocaleString(),'รายการสินค้า','bi-box-seam','tone-blue')}${stat('ลูกค้าทั้งหมด',Number(summary.customers).toLocaleString(),'บัญชีลูกค้า','bi-people','tone-green')}${stat('คำสั่งซื้อทั้งหมด',Number(summary.orders).toLocaleString(),'รายการคำสั่งซื้อ','bi-receipt','tone-purple')}${stat('ยอดขายโดยประมาณ',money(summary.revenue),'คำนวณจากราคาปัจจุบันของสินค้า','bi-currency-dollar','tone-orange')}</div><div class="dashboard-grid"><section class="card-panel"><div class="card-title"><div><h2>ยอดขายรายเดือน</h2><p>ประมาณการตามวันที่สั่งซื้อ</p></div></div><div class="chart-wrap"><canvas id="report-sales-chart"></canvas></div></section><section class="card-panel"><div class="card-title"><div><h2>สินค้าขายดี 5 อันดับ</h2><p>จัดอันดับตามยอดขายโดยประมาณ</p></div></div>${tableHtml([{key:'product_name',label:'สินค้า'},{key:'quantity',label:'จำนวน'},{key:'revenue',label:'ยอดขาย',money:true}],topProducts)}</section></div><p class="small text-secondary mt-3 mb-0">หมายเหตุ: ฐานข้อมูลเดิมไม่ได้บันทึกราคาสินค้า ณ วันที่สั่งซื้อ ยอดขายจึงคำนวณจากราคาปัจจุบัน และไม่ใช่ยอดบัญชีจริง</p>`;
 const salesCanvas=$('#report-sales-chart');
 chartInstances.push(new Chart(salesCanvas,{type:'bar',data:{labels:monthlySales.map(row=>row.month),datasets:[{label:'ยอดขายโดยประมาณ',data:monthlySales.map(row=>Number(row.revenue)),backgroundColor:'rgba(53,109,243,.72)',borderRadius:5}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{y:{beginAtZero:true,ticks:{callback:value=>money(value)}}}}}));
 $('#export-report').addEventListener('click',()=>downloadCsv('northwind-business-report.csv',[
  ['ประเภทรายงาน','รายการ','จำนวน','ยอดขายโดยประมาณ'],
  ...monthlySales.map(row=>['ยอดขายรายเดือน',row.month,'',row.revenue]),
  ...topProducts.map(row=>['สินค้าขายดี',row.product_name,row.quantity,row.revenue]),
  ['สรุป','สินค้า',summary.products,''],
  ['สรุป','ลูกค้า',summary.customers,''],
  ['สรุป','คำสั่งซื้อ',summary.orders,''],
  ['สรุป','ยอดขายโดยประมาณ','',summary.revenue]
 ]));
}

async function renderOrders(root){
 const limit=20,query=new URLSearchParams({page:String(orderPage),limit:String(limit),sort:orderSort});
 if(orderSearch)query.set('search',orderSearch);
 const result=await api(`/orders?${query}`);
 orderPage=result.meta.page;
 const totalPages=Math.max(1,Math.ceil(result.meta.total/limit)),first=result.meta.total?((orderPage-1)*limit)+1:0,last=Math.min(orderPage*limit,result.meta.total);
 root.innerHTML=heading('ORDER MANAGEMENT','คำสั่งซื้อ','ข้อมูลคำสั่งซื้อจากฐานข้อมูล',`<button class="btn btn-primary btn-sm px-3" id="new-order"><i class="bi bi-plus-lg me-1"></i>สร้างคำสั่งซื้อ</button>`)+
 `<section class="card-panel"><div class="toolbar"><div class="d-flex align-items-center gap-2 flex-wrap"><div class="search-input"><i class="bi bi-search"></i><input id="order-search" class="form-control form-control-sm" placeholder="ค้นหาด้วย ID หรือชื่อลูกค้า..." value="${escapeHtml(orderSearch)}"></div><div class="btn-group btn-group-sm" role="group" aria-label="เรียงตาม ID"><button type="button" class="btn ${orderSort==='asc'?'btn-primary':'btn-light'}" data-order-sort="asc" title="เรียง ID จากน้อยไปมาก" aria-label="เรียง ID จากน้อยไปมาก"><i class="bi bi-arrow-up"></i></button><button type="button" class="btn ${orderSort==='desc'?'btn-primary':'btn-light'}" data-order-sort="desc" title="เรียง ID จากมากไปน้อย" aria-label="เรียง ID จากมากไปน้อย"><i class="bi bi-arrow-down"></i></button></div></div><div class="small text-secondary">${result.meta.total.toLocaleString()} รายการ</div></div>${tableHtml([{key:'order_id',label:'เลขที่คำสั่งซื้อ'},{key:'company_name',label:'ลูกค้า'},{key:'order_date',label:'วันที่สั่งซื้อ'},{key:'employee_name',label:'พนักงาน'},{key:'shipper_name',label:'บริษัทขนส่ง'},{key:'total',label:'ยอดรวมโดยประมาณ',money:true}],result.data,'orders')}<div class="pagination-line"><span>แสดง ${first.toLocaleString()}–${last.toLocaleString()} จาก ${result.meta.total.toLocaleString()} รายการ</span><div class="d-flex align-items-center gap-2"><span>หน้า ${orderPage} / ${totalPages}</span><button type="button" class="btn btn-light btn-sm" id="order-prev" aria-label="หน้าก่อนหน้า" ${orderPage<=1?'disabled':''}><i class="bi bi-chevron-left"></i></button><button type="button" class="btn btn-light btn-sm" id="order-next" aria-label="หน้าถัดไป" ${orderPage>=totalPages?'disabled':''}><i class="bi bi-chevron-right"></i></button></div></div></section>`;
 $('#new-order').addEventListener('click',openOrderModal);
 $('#order-search').addEventListener('input',event=>{orderSearch=event.target.value;orderPage=1;clearTimeout(window.orderSearchTimer);window.orderSearchTimer=setTimeout(()=>renderPage(),300)});
 document.querySelectorAll('[data-order-sort]').forEach(button=>button.addEventListener('click',()=>{if(orderSort!==button.dataset.orderSort){orderSort=button.dataset.orderSort;orderPage=1;renderPage()}}));
 $('#order-prev').addEventListener('click',()=>{if(orderPage>1){orderPage--;renderPage()}});
 $('#order-next').addEventListener('click',()=>{if(orderPage<totalPages){orderPage++;renderPage()}});
 document.querySelectorAll('[data-order-detail]').forEach(button=>button.addEventListener('click',()=>openOrderDetail(button.dataset.orderDetail)));
}

async function openOrderDetail(id){
 try{
  const {order,items}= (await api(`/orders/${id}`)).data;
  const itemRows=items.map(item=>({
   product_name:item.product_name,
   quantity:Number(item.quantity),
   unit_price:Number(item.unit_price),
   subtotal:Number(item.quantity)*Number(item.unit_price)
  }));
  const total=itemRows.reduce((sum,item)=>sum+item.subtotal,0);
  const detail=(label,value)=>`<div class="detail-item"><small>${label}</small><strong>${escapeHtml(value||'—')}</strong></div>`;
  const modal=showModal(`รายละเอียดคำสั่งซื้อ #${escapeHtml(order.order_id)}`,
   `<div class="detail-grid mb-4">${detail('ลูกค้า',order.company_name)}${detail('วันที่สั่งซื้อ',order.order_date)}${detail('พนักงาน',order.employee_name)}${detail('บริษัทขนส่ง',order.shipper_name)}</div><div class="card-title mb-2"><div><h2>รายการสินค้า</h2><p>${itemRows.length.toLocaleString()} รายการ</p></div></div>${itemRows.length?`<div class="table-responsive"><table class="table"><thead><tr><th>สินค้า</th><th class="text-end">จำนวน</th><th class="text-end">ราคาต่อหน่วย</th><th class="text-end">รวมโดยประมาณ</th></tr></thead><tbody>${itemRows.map(item=>`<tr><td>${escapeHtml(item.product_name||'ไม่พบข้อมูลสินค้า')}</td><td class="text-end">${item.quantity.toLocaleString()}</td><td class="text-end">${money(item.unit_price)}</td><td class="text-end">${money(item.subtotal)}</td></tr>`).join('')}</tbody><tfoot><tr><th colspan="3" class="text-end">ยอดรวมโดยประมาณ</th><th class="text-end">${money(total)}</th></tr></tfoot></table></div>`:'<div class="empty-state py-4">ไม่พบรายการสินค้าในคำสั่งซื้อนี้</div>'}<p class="small text-secondary mt-3 mb-0">ยอดรวมคำนวณจากราคาปัจจุบันของสินค้า เนื่องจากฐานข้อมูลเดิมไม่ได้เก็บราคาสินค้า ณ วันที่สั่งซื้อ</p>`,'modal-lg');
  return modal;
 }catch(error){
  toast(error.message,'danger');
 }
}

async function openOrderModal(){
 try{
  const [customers,products,employees,shippers]=await Promise.all([
   loadAllResourceRows('customers'),
   loadAllResourceRows('products'),
   loadAllResourceRows('employees'),
   loadAllResourceRows('shippers')
  ]);
  if(!customers.length||!products.length)throw new Error('ต้องมีข้อมูลลูกค้าและสินค้าในฐานข้อมูลก่อนสร้างคำสั่งซื้อ');
  const modal=showModal('สร้างคำสั่งซื้อใหม่',`<form id="order-form"><div class="form-grid"><div class="form-field"><label>ลูกค้า *</label><select class="form-select" name="customer_id" required><option value="">เลือกลูกค้า</option>${customers.map(item=>`<option value="${item.customer_id}">${escapeHtml(item.customer_id)} - ${escapeHtml(item.company_name)}</option>`).join('')}</select></div><div class="form-field"><label>พนักงาน</label><select class="form-select" name="employee_id"><option value="">ไม่ระบุ</option>${employees.map(item=>`<option value="${item.employee_id}">${escapeHtml(item.employee_id)} - ${escapeHtml(item.first_name)} ${escapeHtml(item.last_name)}</option>`).join('')}</select></div><div class="form-field"><label>บริษัทขนส่ง</label><select class="form-select" name="ship_via"><option value="">ไม่ระบุ</option>${shippers.map(item=>`<option value="${item.shipper_id}">${escapeHtml(item.shipper_id)} - ${escapeHtml(item.company_name)}</option>`).join('')}</select></div></div><hr><div class="d-flex justify-content-between align-items-center mb-2"><strong class="small">รายการสินค้า</strong><button type="button" class="btn btn-light btn-sm" id="add-order-item"><i class="bi bi-plus"></i> เพิ่มสินค้า</button></div><div id="order-items"></div><div class="small text-secondary mt-2">ยอดรวมประมาณจากราคาปัจจุบันของสินค้า เนื่องจากฐานข้อมูลเดิมไม่ได้เก็บราคาต่อรายการ</div><div class="d-flex justify-content-end gap-2 mt-4"><button type="button" class="btn btn-light" data-bs-dismiss="modal">ยกเลิก</button><button class="btn btn-primary">บันทึกคำสั่งซื้อ</button></div></form>`,'modal-lg');
  const itemRoot=$('#order-items');
  const addLine=()=>{
   const row=document.createElement('div');
   row.className='order-product-line';
   row.innerHTML=`<select class="form-select form-select-sm" name="product_id" required><option value="">เลือกสินค้า</option>${products.map(item=>`<option value="${item.product_id}">${escapeHtml(item.product_id)} - ${escapeHtml(item.product_name)} (${money(item.unit_price)})</option>`).join('')}</select><input name="quantity" class="form-control form-control-sm" type="number" min="1" value="1" required><button type="button" class="icon-btn text-danger remove-line" aria-label="ลบรายการสินค้า"><i class="bi bi-x-lg"></i></button>`;
   itemRoot.append(row);
   $('.remove-line',row).addEventListener('click',()=>{if(itemRoot.children.length>1)row.remove()});
  };
  addLine();
  $('#add-order-item').addEventListener('click',addLine);
  $('#order-form').addEventListener('submit',async event=>{
   event.preventDefault();
   const form=event.currentTarget,values=Object.fromEntries(new FormData(form));
   const items=[...itemRoot.children].map(row=>({product_id:Number($('[name=product_id]',row).value),quantity:Number($('[name=quantity]',row).value)}));
   try{
    await api('/orders',{method:'POST',body:JSON.stringify({customer_id:Number(values.customer_id),employee_id:values.employee_id?Number(values.employee_id):0,ship_via:values.ship_via?Number(values.ship_via):0,items})});
    modal.hide();
    toast('สร้างคำสั่งซื้อเรียบร้อย');
    renderPage();
   }catch(error){
    const old=$('.error-box',form);
    if(old)old.remove();
    form.insertAdjacentHTML('afterbegin',`<div class="error-box mb-3">${escapeHtml(error.message)}</div>`);
   }
  });
 }catch(error){
  toast(error.message,'danger');
 }
}

function renderApiDocs(root){
 const baseUrl=new URL(API,window.location.origin).href.replace(/\/$/,'');
 const endpoints=[
  ['GET','/auth/status','ตรวจสอบสถานะการตั้งค่าผู้ดูแลระบบ','ไม่ต้องใช้ token'],
  ['POST','/auth/setup','สร้างผู้ดูแลระบบครั้งแรก','username, password, display_name; deployment นี้ตั้งค่าแล้ว'],
  ['POST','/auth/login','เข้าสู่ระบบและรับ JWT','username, password'],
  ['POST','/auth/register','สร้างบัญชีผู้ดูแลระบบ','ต้องใช้ JWT'],
  ['GET','/auth/me','ดูข้อมูลผู้ดูแลระบบที่เข้าสู่ระบบ','ต้องใช้ JWT'],
  ['GET','/{resource}','อ่านข้อมูลแบบแบ่งหน้า ค้นหา และเรียง ID','JWT; products, categories, customers, suppliers, employees, shippers'],
  ['GET','/{resource}/{id}','อ่านข้อมูลรายการเดียว','JWT'],
  ['POST','/{resource}','เพิ่มข้อมูล','JWT; ส่ง JSON ตามฟิลด์ของ resource'],
  ['PUT / PATCH','/{resource}/{id}','แก้ไขฟิลด์ที่ส่งมา','JWT; ส่ง JSON'],
  ['DELETE','/{resource}/{id}','ลบข้อมูล','JWT; อาจถูกปฏิเสธถ้ามีข้อมูลอื่นอ้างอิง'],
  ['GET','/orders','อ่านรายการคำสั่งซื้อ','JWT; รองรับ page, limit, search, sort'],
  ['POST','/orders','สร้างคำสั่งซื้อและรายการสินค้า','JWT; customer_id และ items[{product_id, quantity}]'],
  ['GET','/orders/{id}','อ่านรายละเอียดและรายการสินค้า','JWT'],
  ['PUT','/orders/{id}','แก้ไขข้อมูลคำสั่งซื้อ','JWT; customer_id, employee_id, ship_via, order_date'],
  ['PATCH','/orders/{id}','เปลี่ยนสถานะคำสั่งซื้อ','JWT; ไม่รองรับและตอบกลับ 422'],
  ['DELETE','/orders/{id}','ลบคำสั่งซื้อและรายการสินค้า','JWT'],
  ['GET','/reports/summary','สรุปจำนวนและยอดขายโดยประมาณ','JWT; ยอดขายใช้ราคาปัจจุบันของสินค้า']
 ];
 root.innerHTML=heading('DEVELOPER CENTER','API Documentation','ข้อมูลและ endpoint ที่เชื่อมกับฐานข้อมูล')+
 `<section class="card-panel mb-3"><div class="card-title"><div><h2>Base URL</h2><p>URL นี้ปรับตามโดเมนและตำแหน่งที่ติดตั้งระบบอยู่</p></div></div><code>${escapeHtml(baseUrl)}</code><p class="mt-2 mb-0 small text-muted">InfinityFree: https://northwindbms.gt.tc/api/v1</p></section>
 <section class="card-panel mb-3"><div class="card-title"><div><h2>วิธีเรียกใช้งาน</h2><p>เข้าสู่ระบบด้วย POST /auth/login แล้วนำ token ที่ได้ไปใช้กับ endpoint ที่ระบุว่าต้องใช้ JWT</p></div></div><p class="mb-1">Header สำหรับ endpoint ที่ต้องยืนยันตัวตน:</p><pre class="p-3 rounded-3 mb-0" style="background:#111a2b;color:#b9d1ff;font-size:11px;white-space:pre-wrap">Authorization: Bearer &lt;token&gt;\nContent-Type: application/json</pre><p class="mt-2 mb-0 small text-muted">เปิด URL ในเบราว์เซอร์จะส่ง GET เท่านั้น ส่วน /auth/login ต้องเรียกด้วย POST และส่ง JSON {"username":"...","password":"..."}</p></section>
 <section class="card-panel"><div class="card-title"><div><h2>Endpoints</h2><p>Response เป็น JSON และข้อมูลที่กำหนดไว้ในฐานข้อมูล</p></div></div>
 <div class="table-responsive"><table class="table"><thead><tr><th>Method</th><th>Endpoint</th><th>รายละเอียด</th><th>ข้อมูล/ข้อจำกัด</th></tr></thead><tbody>${endpoints.map(row=>`<tr><td><span class="badge-soft">${row[0]}</span></td><td><code>${row[1]}</code></td><td>${row[2]}</td><td>${row[3]}</td></tr>`).join('')}</tbody></table></div>
 <p class="small text-muted mb-0">รายการแบ่งหน้ารับ page, limit, search, sort และส่ง meta.page, meta.limit, meta.total กลับมา; GET สำเร็จตอบ HTTP 200, การสร้างตอบ HTTP 201 และข้อผิดพลาดเป็น status: false เช่น {"status":true,"data":[],"meta":{"page":1,"limit":20,"total":0}}</p>
 </section>
 <section class="card-panel mt-3"><div class="card-title"><div><h2>ตัวอย่าง Request และ Response</h2><p>ตัวอย่างข้อมูลจำลอง ให้แทนค่าชื่อผู้ใช้ รหัสผ่าน และ token ด้วยค่าของคุณ</p></div></div>
 <h3 class="h6 mt-3">1. เข้าสู่ระบบ (POST)</h3>
 <pre class="p-3 rounded-3" style="background:#111a2b;color:#b9d1ff;font-size:11px;white-space:pre-wrap">POST ${escapeHtml(baseUrl)}/auth/login\nContent-Type: application/json\n\n{"username":"ชื่อผู้ใช้ของคุณ","password":"รหัสผ่านของคุณ"}</pre>
 <p class="small">ตัวอย่างคำตอบสำเร็จ (HTTP 200):</p>
 <pre class="p-3 rounded-3" style="background:#111a2b;color:#b9d1ff;font-size:11px;white-space:pre-wrap">{"status":true,"data":{"token":"&lt;JWT_TOKEN&gt;","user":{"id":1,"username":"admin","display_name":"Northwind Admin","role":"admin"}}}</pre>
 <h3 class="h6 mt-3">2. อ่านและค้นหาสินค้า (GET)</h3>
 <pre class="p-3 rounded-3" style="background:#111a2b;color:#b9d1ff;font-size:11px;white-space:pre-wrap">GET ${escapeHtml(baseUrl)}/products?search=chai&amp;page=1&amp;limit=20&amp;sort=asc\nAuthorization: Bearer &lt;JWT_TOKEN&gt;</pre>
 <p class="small">ตัวอย่างคำตอบสำเร็จ (HTTP 200):</p>
 <pre class="p-3 rounded-3" style="background:#111a2b;color:#b9d1ff;font-size:11px;white-space:pre-wrap">{"status":true,"data":[{"product_id":1,"product_name":"Sample Tea","supplier_id":1,"category_id":1,"quantity_per_unit":"10 boxes","unit_price":18.5,"supplier_name":"Example Supplier","category_name":"Beverages"}],"meta":{"page":1,"limit":20,"total":1}}</pre>
 <p class="small mb-1">ตัวอย่างคำตอบผิดพลาดเมื่อไม่มีหรือ token ไม่ถูกต้อง (HTTP 401):</p>
 <pre class="p-3 rounded-3 mb-0" style="background:#111a2b;color:#b9d1ff;font-size:11px;white-space:pre-wrap">{"status":false,"message":"Authorization token is required."}</pre>
 </section>`;
}
