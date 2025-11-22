// Build & Destroy Simulator with Weapons + New Building Shapes
const { Engine, Render, Runner, Composite, Bodies, Body, Mouse, MouseConstraint, Events, Vector } = Matter;

// DOM
const canvas = document.getElementById('stage');
const gravityCheckbox = document.getElementById('gravityToggle');
const snapCheckbox = document.getElementById('snapToggle');
const sizeRange = document.getElementById('sizeRange');
const clearBtn = document.getElementById('clearBtn');
const downloadBtn = document.getElementById('downloadBtn');

const toolbarTools = document.querySelectorAll('.tool');
const toolbarShapes = document.querySelectorAll('.shape');
const weaponEls = document.querySelectorAll('.weapon');

let currentTool = 'spawn';
let currentShape = 'rectangle';

toolbarTools.forEach(t=>t.addEventListener('click',()=>{toolbarTools.forEach(x=>x.classList.remove('active'));t.classList.add('active');currentTool=t.dataset.tool;}));
toolbarShapes.forEach(s=>s.addEventListener('click',()=>{toolbarShapes.forEach(x=>x.classList.remove('active'));s.classList.add('active');currentShape=s.dataset.shape;}));

// --- Matter.js setup ---
const engine = Engine.create();
const world = engine.world;
world.gravity.y = gravityCheckbox.checked ? 1 : 0;

const render = Render.create({
    canvas: canvas,
    engine: engine,
    options: { width: window.innerWidth-220, height: window.innerHeight, wireframes:false, background:'transparent' }
});
Render.run(render);
Runner.run(Runner.create(), engine);

// walls
const wallThickness = 80;
function createBounds() {
    if(world.boundsBodies) Composite.remove(world, world.boundsBodies);
    const w = render.options.width;
    const h = render.options.height;
    const left = Bodies.rectangle(-wallThickness/2,h/2,wallThickness,h*3,{isStatic:true});
    const right = Bodies.rectangle(w+wallThickness/2,h/2,wallThickness,h*3,{isStatic:true});
    const floor = Bodies.rectangle(w/2,h+wallThickness/2,w*2,wallThickness,{isStatic:true});
    const ceiling = Bodies.rectangle(w/2,-wallThickness/2,w*2,wallThickness,{isStatic:true});
    world.boundsBodies=[left,right,floor,ceiling];
    Composite.add(world, world.boundsBodies);
}
createBounds();
window.addEventListener('resize',()=>{render.canvas.width=window.innerWidth-220;render.canvas.height=window.innerHeight;createBounds();});

// mouse & drag
const mouse = Mouse.create(render.canvas);
const mouseConstraint = MouseConstraint.create(engine,{mouse, constraint:{stiffness:0.2, render:{visible:false}}});
Composite.add(world,mouseConstraint);

function snap(v){return snapCheckbox.checked?Math.round(v/20)*20:v;}
function randomColor(){return '#'+Math.floor(Math.random()*16777215).toString(16).padStart(6,'0');}

// Spawn shape
function spawnShape(x,y){
    const size=parseInt(sizeRange.value)||50;
    const opts={friction:0.3,restitution:0.1,render:{fillStyle:randomColor()}};
    let body;
    switch(currentShape){
        case 'rectangle': body=Bodies.rectangle(snap(x),snap(y),size,Math.max(20,size*0.6),opts); break;
        case 'circle': body=Bodies.circle(snap(x),snap(y),Math.max(8,size/2),opts); break;
        case 'beam': body=Bodies.rectangle(snap(x),snap(y),size*2,Math.max(10,size*0.4),opts); break;
        case 'glass': body=Bodies.rectangle(snap(x),snap(y),size,Math.max(15,size*0.4),{...opts,render:{fillStyle:'rgba(173,216,230,0.5)'}}); break;
        case 'trampoline': body=Bodies.rectangle(snap(x),snap(y),size,Math.max(8,size*0.3),{...opts,restitution:1.2}); break;
    }
    Composite.add(world,body);
    return body;
}

// pointer click
canvas.addEventListener('pointerdown',e=>{
    const rect=canvas.getBoundingClientRect();
    const x=(e.clientX-rect.left)*(canvas.width/rect.width);
    const y=(e.clientY-rect.top)*(canvas.height/rect.height);
    if(currentTool==='spawn'){spawnShape(x,y);}
    else if(currentTool==='erase'){
        const bodies=Composite.allBodies(world);
        for(let i=bodies.length-1;i>=0;i--){
            const b=bodies[i];
            if(b.isStatic) continue;
            const dx=b.position.x-x;
            const dy=b.position.y-y;
            if(Math.sqrt(dx*dx+dy*dy)<50){Composite.remove(world,b);break;}
        }
    }
});

// weapons drag-drop
let dragging=null, ghost=null;
weaponEls.forEach(w=>{
    w.addEventListener('pointerdown',ev=>{ev.preventDefault();dragging={type:w.dataset.weapon};ghost=document.createElement('div');ghost.className='weapon-ghost';ghost.style.position='fixed';ghost.style.left=ev.clientX+'px';ghost.style.top=ev.clientY+'px';ghost.style.padding='6px 10px';ghost.style.background='#444';ghost.style.color='white';ghost.style.borderRadius='6px';ghost.textContent=w.textContent;document.body.appendChild(ghost);window.addEventListener('pointermove',dragMove);window.addEventListener('pointerup',dragEnd,{once:true});});
});
function dragMove(ev){if(ghost){ghost.style.left=ev.clientX+'px';ghost.style.top=ev.clientY+'px';}}
function dragEnd(ev){
    if(!dragging) return;
    const rect=canvas.getBoundingClientRect();
    if(ev.clientX>=rect.left && ev.clientX<=rect.right && ev.clientY>=rect.top && ev.clientY<=rect.bottom){spawnWeapon(ev,dragging.type);}
    if(ghost&&ghost.parentNode) ghost.parentNode.removeChild(ghost);ghost=null;dragging=null;
    window.removeEventListener('pointermove',dragMove);
}

function spawnWeapon(ev,type){
    const rect=canvas.getBoundingClientRect();
    const x=(ev.clientX-rect.left)*(canvas.width/rect.width);
    const y=(ev.clientY-rect.top)*(canvas.height/rect.height);
    const size=parseInt(sizeRange.value)||40;
    const opts={friction:0.4,restitution:0.2,label:'weapon'};
    let body;
    if(type==='bomb'){body=Bodies.circle(snap(x),snap(y),Math.max(12,size/2),{...opts,plugin:{weaponType:'bomb'},render:{fillStyle:'#222',strokeStyle:'#444',lineWidth:3}});}
    else if(type==='tnt'){body=Bodies.rectangle(snap(x),snap(y),size*0.9,Math.max(18,size*0.6),{...opts,plugin:{weaponType:'tnt'},render:{fillStyle:'#b14d2a',strokeStyle:'#8a2f14',lineWidth:3}});}
    else{body=Bodies.circle(snap(x),snap(y),Math.max(8,size/2.2),{...opts,plugin:{weaponType:'grenade'},render:{fillStyle:'#2f7a2f',strokeStyle:'#1e4f1e',lineWidth:3}});}
    Composite.add(world,body);
}

// tap-to-explode weapons
Events.on(mouseConstraint,'mousedown',e=>{
    const mousePos=e.mouse.position;
    const found=Matter.Query.point(Composite.allBodies(world),mousePos)[0];
    if(found&&found.label==='weapon') detonate(found);
});

function detonate(body){
    if(!body||body._destroying)return; body._destroying=true;
    const type=(body.plugin&&body.plugin.weaponType)||'bomb';
    const pos=body.position;
    if(type==='grenade') explode(pos.x,pos.y,0.12,100);
    else if(type==='bomb') explode(pos.x,pos.y,0.09,160);
    else{explode(pos.x,pos.y,0.07,300);spawnFragments(pos.x,pos.y,12);}
    Composite.remove(world,body);
}

function explode(x,y,force=0.06,radius=120){
    Composite.allBodies(world).forEach(b=>{
        if(b.isStatic) return;
        const dir=Vector.sub(b.position,{x,y});
        const d=Math.max(1,Vector.magnitude(dir));
        if(d>radius) return;
        const mag=(force*(1-(d/radius)))*(b.mass||1);
        Body.applyForce(b,b.position,Vector.mult(Vector.normalise(dir),mag));
        Body.setAngularVelocity(b,b.angularVelocity+(Math.random()-0.5)*0.2*(1-(d/radius)));
    });
}
function spawnFragments(x,y,count=8){
    for(let i=0;i<count;i++){
        const w=6+Math.round(Math.random()*12); const h=6+Math.round(Math.random()*12);
        const frag=Bodies.rectangle(x+(Math.random()-0.5)*30,y+(Math.random()-0.5)*30,w,h,{friction:0.3,restitution:0.2,render:{fillStyle:'#'+Math.floor(Math.random()*16777215).toString(16)}});
        Body.setVelocity(frag,{x:(Math.random()-0.5)*10,y:(Math.random()-0.8)*8});
        Composite.add(world,frag);
        setTimeout(()=>{try{Composite.remove(world,frag);}catch(e){}},8000+Math.random()*6000);
    }
}

// clear & download
clearBtn.addEventListener('click',()=>{Composite.allBodies(world).slice().forEach(b=>{if(!b.isStatic) Composite.remove(world,b);});});
downloadBtn.addEventListener('click',()=>{const url=canvas.toDataURL('image/png');const a=document.createElement('a');a.href=url;a.download='build-destroy.png';a.click();});

// gravity toggle
gravityCheckbox.addEventListener('change',()=>{world.gravity.y=gravityCheckbox.checked?1:0;});

console.log('Simulator loaded. Drag weapons or spawn shapes!');
