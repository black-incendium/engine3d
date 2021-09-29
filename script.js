let canvas = document.querySelector('canvas');
let ctx = canvas.getContext('2d');
canvas.width = window.innerWidth*2;
canvas.height = window.innerHeight*2;
window.addEventListener("resize", function() {
	canvas.width = document.body.clientWidth*2;
	canvas.height = document.body.clientHeight*2;
});

let glob = (function(){
    let fov = Math.PI/2;
    let distance = 750;
    let sensitivity = 1/300;
    let pressedKeys = {};
    let moveSensitivity = 1/30;
    let active = false;

    return {
        fov: fov,
        distance: distance,
        sensitivity: sensitivity,
        pressedKeys: pressedKeys,
        moveSensitivity: moveSensitivity,
        active: active
    }
})()

let environment = (function(){
    let objects = [];
    let top = {x:0, y:1, z:0};
    let front = {x:0, y:0, z:1};
    let right = {x:1, y:0, z:0};
    let actualAngle = 0;
    let actualPosition = {x:0,y:0,z:0}

    function newCube({x, y, z, size, color}) {
        let cube = {
            points: [
                {x:x-size/2,y:y-size/2,z:z-size/2},
                {x:x-size/2,y:y-size/2,z:z+size/2},
                {x:x-size/2,y:y+size/2,z:z-size/2},
                {x:x-size/2,y:y+size/2,z:z+size/2},
                {x:x+size/2,y:y-size/2,z:z-size/2},
                {x:x+size/2,y:y-size/2,z:z+size/2},
                {x:x+size/2,y:y+size/2,z:z-size/2},
                {x:x+size/2,y:y+size/2,z:z+size/2},
            ]
        }
        cube.lines = [
            {from: 0, to: 1},
            {from: 0, to: 2},
            {from: 1, to: 3},
            {from: 2, to: 3},
            {from: 4, to: 5},
            {from: 4, to: 6},
            {from: 5, to: 7},
            {from: 6, to: 7},
            {from: 0, to: 4},
            {from: 1, to: 5},
            {from: 2, to: 6},
            {from: 3, to: 7},
        ]
        cube.type = 'cube';
        cube.color = color;
        objects.push(cube);
    }

    function newPoint({x, y, z, color}) {
        objects.push({
            points: [{x: x, y: y, z: z}],
            type: 'point',
            color: color
        })
    }

    function rotateAround({point, axis, angle}) {
        let d = Math.sqrt(axis.x**2 + axis.y**2 + axis.z**2);
        [axis.x, axis.y, axis.z] = [axis.x/d, axis.y/d, axis.z/d];
        let q = {
            r: Math.cos(angle/2),
            i: Math.sin(angle/2)*axis.x,
            j: Math.sin(angle/2)*axis.y,
            k: Math.sin(angle/2)*axis.z,
        }
        let newX = point.x*(1-2*q.j**2-2*q.k**2) + point.y*(q.i*q.j-q.k*q.r)*2 + point.z*(q.i*q.k+q.j*q.r)*2;
        let newY = point.x*(q.i*q.j+q.k*q.r)*2 + point.y*(1-2*q.i**2-2*q.k**2) + point.z*(q.j*q.k-q.i*q.r)*2;
        let newZ = point.x*(q.i*q.k-q.j*q.r)*2 + point.y*(q.j*q.k+q.i*q.r)*2 + point.z*(1-2*q.i**2-2*q.j**2);
        return {x: +newX.toFixed(10), y: +newY.toFixed(10), z: +newZ.toFixed(10)}
    }

    function calcObjPos(obj) {
        obj.renderedPoints = obj.points.map(function(el){
            if (el.z<0) return {z: el.z}
            return {
                x: el.x/el.z/Math.tan(glob.fov/2)*glob.distance+canvas.width/2,
                y: -el.y/el.z/Math.tan(glob.fov/2)*glob.distance+canvas.height/2,
                z: el.z 
            }
        });
        return obj;
    }

    function rotateY(angle) {
        objects.forEach(function(o){
            o.points = o.points.map(function(p){
                return rotateAround({point: p, axis: top, angle: -angle});
            });
        });
    }

    function rotateX(angle) {
        if (actualAngle+angle>Math.PI/2) angle = Math.PI/2-actualAngle;
        else if (actualAngle+angle<-Math.PI/2) angle = -Math.PI/2-actualAngle;
        objects.forEach(function(o){
            o.points = o.points.map(function(point){
                return {
                    x: point.x,
                    y: point.y*Math.cos(angle)+point.z*Math.sin(angle),
                    z: point.z*Math.cos(angle)-point.y*Math.sin(angle)
                }
            });
        });
        top = {
            x: top.x,
            y: top.y*Math.cos(angle)+top.z*Math.sin(angle),
            z: top.z*Math.cos(angle)-top.y*Math.sin(angle)
        }
        right = {
            x: right.x,
            y: right.y*Math.cos(angle)+right.z*Math.sin(angle),
            z: right.z*Math.cos(angle)-right.y*Math.sin(angle)
        }
        front = {
            x: front.x,
            y: front.y*Math.cos(angle)+front.z*Math.sin(angle),
            z: front.z*Math.cos(angle)-front.y*Math.sin(angle)
        }
        actualAngle+=angle;
    }

    function move({x = 0, y = 0, z = 0}) {
        objects.forEach(function(o){
            o.points.forEach(function(p){
                p.x -= right.x*x + front.x*z + top.x*y
                p.y -= right.y*x + front.y*z + top.y*y
                p.z -= right.z*x + front.z*z + top.z*y
            })
        });
        actualPosition.x += x;
        actualPosition.y += y;
        actualPosition.z += z;
    }

    /* let size = 2; 
    
    for (let i=-size; i<=size; i++) {
        for (let j=-size; j<=size; j++) {
            for (let k=-size; k<=size; k++) {
                newCube({x: i*15, y: j*15, z: k*15, size: 5});
            }   
        }
    } */

    for (let i=0; i<200; i++) {
        newPoint({x: Math.random()*2-1, y:Math.random()*2-1, z:Math.random()*2-1+3});
    }
    newCube({x:0,y:0,z:3,size:2,color:'#555'})
    for (let i=0; i<5; i++) {
        newCube({x:Math.random()*2-1+5, y:Math.random()*2-1, z:Math.random()*2-1+3, size: Math.random()*0.5+0.3, color:'#888'})
    }
    for(let i=-1; i<=1; i++) {
        for(let j=-1; j<=1; j++) {
            for(let k=-1; k<=1; k++) {
                newCube({x:-5+i, y:0+j, z:3+k, size:1/3, color:'#888'})
            }
        }   
    }

    return {
        get objects() {
            return objects.map(calcObjPos);
        },
        rotateY: rotateY,
        rotateX: rotateX,
        move: move
    }
})();

let rctx = (function(){
    function renderObj(obj) {
        if (obj.type == 'cube') {
            ctx.strokeStyle = obj.color ?? "white";
            ctx.lineWidth = 4;
            obj.lines.forEach(function(el){
                if (obj.renderedPoints[el.from].z<=0 && obj.renderedPoints[el.to].z<=0) return;
                else if (obj.renderedPoints[el.from].z<=0 || obj.renderedPoints[el.to].z<=0) {
                    let n = obj.points[el.from].z<=0 ? obj.points[el.from] : obj.points[el.to];
                    let p = obj.points[el.from].z<=0 ? obj.points[el.to] : obj.points[el.from];
                    let pNumber = obj.points[el.from].z<=0 ? el.to : el.from;
                    let auxPoint = {
                        x: (n.x+(n.x-p.x)*(n.z-1)/(p.z-n.z))/Math.tan(glob.fov/2)*glob.distance+canvas.width/2,
                        y: -(n.y+(n.y-p.y)*(n.z-1)/(p.z-n.z))/Math.tan(glob.fov/2)*glob.distance+canvas.height/2
                    }
                    if (p.z==1) {
                        auxPoint.x=(n.x+(n.x-p.x)*(n.z-2)/(p.z-n.z))/2/Math.tan(glob.fov/2)*glob.distance+canvas.width/2;
                        auxPoint.y=-(n.y+(n.y-p.y)*(n.z-2)/(p.z-n.z))/2/Math.tan(glob.fov/2)*glob.distance+canvas.height/2
                        auxPoint.x = 1000*((p.z-n.z)/(p.z-2))*(auxPoint.x-obj.renderedPoints[pNumber].x)+auxPoint.x;
                        auxPoint.y = 1000*((p.z-n.z)/(p.z-2))*(auxPoint.y-obj.renderedPoints[pNumber].y)+auxPoint.y;
                    }
                    else {
                        auxPoint.x = 1000*((p.z-n.z)/(p.z-1))*(auxPoint.x-obj.renderedPoints[pNumber].x)+auxPoint.x;
                        auxPoint.y = 1000*((p.z-n.z)/(p.z-1))*(auxPoint.y-obj.renderedPoints[pNumber].y)+auxPoint.y;
                    }
                    
                    ctx.beginPath();
                    ctx.moveTo(obj.renderedPoints[pNumber].x, obj.renderedPoints[pNumber].y);
                    ctx.lineTo(auxPoint.x, auxPoint.y);
                    ctx.closePath();
                    ctx.stroke();
                }
                else  {
                    ctx.beginPath();
                    ctx.moveTo(obj.renderedPoints[el.from].x, obj.renderedPoints[el.from].y);
                    ctx.lineTo(obj.renderedPoints[el.to].x, obj.renderedPoints[el.to].y);
                    ctx.closePath();
                    ctx.stroke();
                }
            }); 
        } 
        else if (obj.type == 'point') {
            if (obj.renderedPoints[0].z<0.03) return;
            ctx.fillStyle = obj.color ?? "white";
            let size = 1/obj.renderedPoints[0].z**2+1;
            ctx.fillRect(obj.renderedPoints[0].x-size/2, obj.renderedPoints[0].y-size/2,size,size)
        } 
         
    }

    function render(arr) {
        ctx.clearRect(0,0,canvas.width, canvas.height);
        arr.forEach(function(el){
            renderObj(el);
        });
    }

    return {
        render: render
    };
})();

let auxMove = {x:0, y:0, z:0}

function draw() {
    auxMove.x = 0, auxMove.y = 0, auxMove.z = 0;
    rctx.render(environment.objects);
    if (glob.pressedKeys['w']) auxMove.z+=1;
    if (glob.pressedKeys['s']) auxMove.z-=1;
    if (glob.pressedKeys['a']) auxMove.x-=1;
    if (glob.pressedKeys['d']) auxMove.x+=1;
    if (glob.pressedKeys['shift']) auxMove.y-=1;
    if (glob.pressedKeys[' ']) auxMove.y+=1;
    environment.move({x:auxMove.x*glob.moveSensitivity, y:auxMove.y*glob.moveSensitivity, z:auxMove.z*glob.moveSensitivity});
    window.requestAnimationFrame(draw);
}

window.requestAnimationFrame(draw);

canvas.requestPointerLock = canvas.requestPointerLock || canvas.mozRequestPointerLock;
document.querySelector(".start span").addEventListener('click', function(){
    let promise1 = canvas.requestPointerLock();
    let promise2 = canvas.requestFullscreen();
    Promise.all([promise1, promise2]).then(_=>{
        document.querySelector('.description').classList.add('hidden');
        glob.active = true;
    }, error => {});
}); 

document.addEventListener('pointerlockchange', function(){
    if (document.pointerLockElement == canvas) return;
    glob.active = false;
    document.querySelector('.description').classList.remove('hidden');
})

canvas.addEventListener('mousemove', function(e){
    if (glob.active==false) return;
    environment.rotateY(e.movementX*glob.sensitivity);
    environment.rotateX(e.movementY*glob.sensitivity);
});

document.addEventListener('keydown', function(e){
    if (glob.active==false) return;
    glob.pressedKeys[e.key.toLowerCase()] = true;
})

document.addEventListener('keyup', function(e){
    if (glob.active==false) return;
    glob.pressedKeys[e.key.toLowerCase()] = false;
})

document.addEventListener('wheel', function(e){
    if (glob.active==false) return;
    glob.moveSensitivity -= e.deltaY/50000;
    glob.moveSensitivity = Math.max(Math.min(1/10, glob.moveSensitivity), 1/1000);
})