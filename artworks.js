export const artworks=[
 {id:'sneakers',title:'球鞋手绘',file:'sneakers.png',alt:'蓝白球鞋与橙色点缀的手绘作品'},
 {id:'portrait',title:'人物色彩练习',file:'portrait.webp',alt:'棕色长发人物回眸的肖像色彩练习'},
 {id:'mirror',title:'镜面场景插画',file:'mirror.webp',alt:'蓝天白云与红色道路反光镜中的人物场景'},
 {id:'bee-dog',title:'蜜蜂小狗',file:'bee-dog.webp',alt:'结合小狗和蜜蜂形象的手绘作品'}
];

export function renderArtworks(host){
 function overview(focusId){
  host.innerHTML='<div class="art-grid">'+artworks.map(a=>`<button class="art-card" data-art="${a.id}" aria-label="查看${a.title}"><span class="art-card-image"><img src="./assets/art/${a.file}" alt="${a.alt}" decoding="async"></span><span class="art-card-title">${a.title}<span aria-hidden="true">↗</span></span></button>`).join('')+'</div>';
  host.querySelectorAll('[data-art]').forEach(button=>button.addEventListener('click',()=>detail(artworks.findIndex(a=>a.id===button.dataset.art))));
  if(focusId)host.querySelector(`[data-art="${focusId}"]`)?.focus();
 }
 function detail(index){
  const a=artworks[(index+artworks.length)%artworks.length];
  host.innerHTML=`<section class="art-detail" aria-label="${a.title}"><div class="art-detail-top"><button class="back-link" data-art-back>返回手绘记录</button><h3 tabindex="-1">${a.title}</h3><span>${(index+artworks.length)%artworks.length+1} / ${artworks.length}</span></div><img class="art-detail-image" src="./assets/art/${a.file}" alt="${a.alt}"><div class="art-detail-controls"><button class="outline-btn" aria-label="上一幅手绘">← 上一幅</button><button class="outline-btn" aria-label="下一幅手绘">下一幅 →</button></div></section>`;
  host.querySelector('[data-art-back]').addEventListener('click',()=>overview(a.id));
  host.querySelector('[aria-label="上一幅手绘"]').addEventListener('click',()=>detail((index-1+artworks.length)%artworks.length));
  host.querySelector('[aria-label="下一幅手绘"]').addEventListener('click',()=>detail((index+1)%artworks.length));
  host.querySelector('h3').focus();
 }
 overview();
}
