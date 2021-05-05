/*
camelCase for function names
PascalCase for class names
underscore for dictionary keys
lowercase for members
UPPERCASE for configurable const
mCamelCase for members
*/
(function (){
    "use strict";
    // Basic app initialization
    (function (){
        // Service worker and updating
        const updateElement=document.getElementById('update');
        const dismissUpdateElement=document.querySelector('#update button');
        if('serviceWorker' in navigator) {
            navigator.serviceWorker.addEventListener('controllerchange',()=>{
                updateElement.classList.add('show');
            });
            navigator.serviceWorker.register('sw.js');
        }
        updateElement.addEventListener("click",()=>{
            location.reload();
        })
        dismissUpdateElement.addEventListener("click",()=>{
            updateElement.classList.remove("show");
            event.stopPropagation();
        })
        // Installing
        const installElement=document.getElementById('install');
        let deferredPrompt;
        window.addEventListener('beforeinstallprompt', (e) => {
            e.preventDefault();
            deferredPrompt = e;
            installElement.style.display = 'inline-block';
        });
        installElement.addEventListener('click', () => {
            installElement.style.display = null;
            deferredPrompt.prompt();
            deferredPrompt.userChoice
            .then((choiceResult) => {
                if (choiceResult.outcome === 'accepted') {
                    console.log('Added to home screen');
                }
                deferredPrompt = null;
            });
        });
    })()
    // Helper values
    const firstInteraction = new Promise(resolve=>{
        function interaction(){
            resolve();
            document.body.removeEventListener("click",interaction);
        }
        document.body.addEventListener("click",interaction);
    })
    // Helper Functions
    function mod(x,y){
        return ((x%y)+y)%y;
    }
    function getSWConst(what){
        return fetch("sw.js").then(response=>response.text()).then(text=>{
            const pos=text.indexOf("const "+what)
            const start=text.indexOf("'",pos)+1
            const end=text.indexOf("'",start)
            return text.substring(start,end);
        })
    }
    function distanceWithin(x1,y1,x2,y2,distance){
        return (x1-x2)**2+(y1-y2)**2<=distance**2;
    }
    function vectorToPoles(vector,poles){
        const p2=Math.PI*2;
        return Math.round((Math.atan2(vector[1],vector[0])%p2+p2)%p2*poles/p2)%poles
    }
    function wait(t){
        return new Promise((a)=>setTimeout(()=>a()),t*1000);
    }
    function openFullscreen(elem) {
        let val,o={ navigationUI: "show" };
        if (elem.requestFullscreen) {
            val=elem.requestFullscreen(o);
        } else if (elem.mozRequestFullScreen) { /* Firefox */
            val=elem.mozRequestFullScreen(o);
        } else if (elem.webkitRequestFullscreen) { /* Chrome, Safari and Opera */
            val=elem.webkitRequestFullscreen(o);
        } else if (elem.msRequestFullscreen) { /* IE/Edge */
            val=elem.msRequestFullscreen(o);
        }
        else{
            return wait(1);
        }
        if (val){
            return val;
        }
        else{
            return wait(1);
        }
    }
    function closeFullscreen() {
        if (document.exitFullscreen) {
            document.exitFullscreen();
        } else if (document.mozCancelFullScreen) { /* Firefox */
            document.mozCancelFullScreen();
        } else if (document.webkitExitFullscreen) { /* Chrome, Safari and Opera */
            document.webkitExitFullscreen();
        } else if (document.msExitFullscreen) { /* IE/Edge */
            document.msExitFullscreen();
        }
    }
    function callAll(list,value){
        list.forEach((callback)=>{
            callback(value);
        })
    }
    // Classes
    function TouchListener(element){
        const mTouches={};
        const mOnNewList=[];
        const mOnUpdateList=[];
        const mOnEndList=[];
        const mOnSwipeList=[];
        const mOnTapsList=[];
        const TAPTIME = 250; 
        let mTapWait=null;
        let mTaps;
        let mTapPosition;
        const positionAt=(touch,time)=>{
            const path=touch.path;
            if (time<touch.startTime){
                return [touch.startX,touch.startY];// Return the initial position if asked before existed
            }
            if (time>=path[path.length-1][2]){
                return [touch.currentX,touch.currentY]; // Return current pos if asked about time after last recorded
            }
            for (let j=path.length-2;j>=0;j--){
                if (path[j][2]<=time){
                    const ratio=(time-path[j][2])/(path[j+1][2]-path[j][2])
                    return [ratio*(path[j+1][0]-path[j][0])+path[j][0],ratio*(path[j+1][1]-path[j][1])+path[j][1]]
                }
            }
        }
        const inertiaSample=(touch,time,milliseconds)=>{
            if (time<touch.startTime||touch.path.length<2){
                return [0,0]; 
            }
            if (time-milliseconds<touch.startTime){
                milliseconds=time-touch.startTime;
            }
            const startP=positionAt(touch,time-milliseconds);
            const endP=positionAt(touch,time);
            return [(endP[0]-startP[0])*1000/milliseconds,(endP[1]-startP[1])*1000/milliseconds];
        }
        function startEvent(event){
            event.preventDefault();
            const rect = element.getBoundingClientRect(),
                  currentTime = new Date().getTime();
            for (let i=0;i<event.changedTouches.length;i++){
                const changedTouch=event.changedTouches[i];
                const touch = {
                    startX:changedTouch.clientX-rect.left,
                    startY:changedTouch.clientY-rect.top,
                    identifier:changedTouch.identifier,
                    active:true,
                    distance:0,
                    startTime:currentTime
                };
                const info={touch:touch,mOnUpdateList:[],mOnEndList:[]};
                info.periodic=setInterval(()=>{callAll(info.mOnUpdateList,touch);callAll(mOnUpdateList,touch);},50);
                mTouches[changedTouch.identifier]=info;
                touch.currentX=touch.startX;
                touch.currentY=touch.startY;
                touch.path=[[touch.startX,touch.startY,currentTime]];
                touch.getInertia=(time=new Date().getTime(),milliseconds=100)=>{
                    return inertiaSample(touch,time,milliseconds);
                }
                touch.addEventListener=(type,callback)=>{
                    if (type.toLowerCase()==='update'){
                        info.mOnUpdateList.push(callback);
                    }
                    else if (type.toLowerCase()==='end'){
                        info.mOnEndList.push(callback);
                    }
                    else{
                        return false;
                    }
                    return true;
                };
                callAll(mOnNewList,touch);
                callAll(info.mOnUpdateList,touch);
                callAll(mOnUpdateList,touch);
            }
        }
        function updateEvent(event){
            event.preventDefault();
            const rect = element.getBoundingClientRect(),
                  currentTime = new Date().getTime();
            for (let i=0;i<event.changedTouches.length;i++){
                const changedTouch=event.changedTouches[i];
                const info = mTouches[changedTouch.identifier];
                const touch = info.touch;
                touch.currentX=changedTouch.clientX-rect.left;
                touch.currentY=changedTouch.clientY-rect.top;
                touch.distance+=Math.sqrt((touch.currentX-touch.path[touch.path.length-1][0])**2+(touch.currentY-touch.path[touch.path.length-1][1])**2);
                touch.path.push([touch.currentX,touch.currentY,currentTime]);
                callAll(info.mOnUpdateList,touch);
                callAll(mOnUpdateList,touch);
            }
        }
        function endEvent(event){
            updateEvent(event);
            const currentTime = new Date().getTime();
            for (let i=0;i<event.changedTouches.length;i++){
                const info=mTouches[event.changedTouches[i].identifier]
                delete mTouches[event.changedTouches[i].identifier];
                const touch=info.touch
                touch.active=false;
                const inertia=touch.getInertia();
                touch.inertia=inertia;
                clearInterval(info.periodic);
                if ((inertia[0]*inertia[0]+inertia[1]*inertia[1])>10000){ // If vector has magnatude greater than 100
                    callAll(mOnSwipeList,touch);
                } else if (touch.distance<50&&currentTime-touch.startTime<TAPTIME) {
                    if (mTapWait){
                        clearTimeout(mTapWait);
                        if (((touch.currentX-mTapPosition[0])**2+(touch.currentY-mTapPosition[1])**2)<10000){ // If tap is close to first tap
                            mTaps+=1;
                        } else{
                            mTaps=1;
                            mTapPosition=[touch.currentX,touch.currentY];
                        }
                    } else{
                        mTaps=1;
                        mTapPosition=[touch.currentX,touch.currentY];
                    }
                    mTapWait=setTimeout(()=>{
                        touch.taps=mTaps;
                        callAll(mOnTapsList,touch)
                        mTapWait=null;
                    },TAPTIME)
                }
                callAll(info.mOnEndList,touch);
                callAll(mOnEndList,touch);
            }
        }
        element.addEventListener("touchstart", startEvent);
        element.addEventListener("touchmove", updateEvent);
        element.addEventListener("touchend", endEvent);
        element.addEventListener("touchcancel", endEvent);
        return {addEventListener:(type,callback)=>{
            if (type.toLowerCase()==='new'){
                mOnNewList.push(callback);
            }
            else if (type.toLowerCase()==='end'){
                mOnEndList.push(callback);
            }
            else if (type.toLowerCase()==='update'){
                mOnUpdateList.push(callback);
            }
            else if (type.toLowerCase()==='swipe'){
                mOnSwipeList.push(callback);
            }
            else if (type.toLowerCase()==='mTaps'){
                mOnTapsList.push(callback);
            }
            else{
                return false;
            }
            return true;
        },removeEventListener:(type,callback)=>{
            if (type.toLowerCase()==='new'){
                removeFromList(mOnNewList,callback);
            }
            else if (type.toLowerCase()==='end'){
                removeFromList(mOnEndList,callback);
            }
            else if (type.toLowerCase()==='update'){
                removeFromList(mOnUpdateList,callback);
            }
            else if (type.toLowerCase()==='swipe'){
                removeFromList(mOnSwipeList,callback);
            }
            else if (type.toLowerCase()==='mTaps'){
                removeFromList(mOnTapsList,callback);
            }
            else{
                return false;
            }
            return true;
        }}
    }
    function InputHandler(buttons){
        const mInputPressors={};
        for (let i=0;i<buttons.length;++i){
            mInputPressors[buttons[i]]=new Set();
        }
        const mKeyboardLookup={};
        const mKeyboardKeys=new Set();
        const mDoOnceButtons=new Set();
        let mPreviousInput={};
        document.body.addEventListener("keydown",(event)=>{
            mKeyboardKeys.add(event.code);
            event.preventDefault();
        });
        document.body.addEventListener("keyup",(event)=>{
            mKeyboardKeys.delete(event.code);
        });
        return {
            map:(key,button)=>{
                mKeyboardLookup[key]=button;
            },
            getInput:()=>{
                for (let key of Object.keys(mInputPressors)){
                    mInputPressors[key].delete("keyboard");
                }
                for (let key of mKeyboardKeys){
                    if (key in mKeyboardLookup){
                        mInputPressors[mKeyboardLookup[key]].add("keyboard");
                    }
                }
                const input = {};
                const newinput={};
                for (let key of Object.keys(mInputPressors)){
                    input[key]=mInputPressors[key].size>0||mDoOnceButtons.has(key);
                    newinput[key]=input[key]&&!mPreviousInput[key]||mDoOnceButtons.has(key);
                }
                mDoOnceButtons.clear();
                mPreviousInput=input;
                return {current:input,new:newinput};
            },
            press:(button,how)=>{
                mInputPressors[button].add(how);
            },
            once:(button)=>{
                mDoOnceButtons.add(button);
            },
            release:(button,how)=>{
                mInputPressors[button].delete(how);
            },
            releaseAll:(how)=>{
                for (let i=0;i<buttons.length;++i){
                    mInputPressors[buttons[i]].delete(how);
                }
                
            },
            set:(button,how,state)=>{
                if (state){
                    mInputPressors[button].add(how);
                }
                else{
                    mInputPressors[button].delete(how);
                }
            }
        }
    }
    // Gamepad http://luser.github.io/gamepadtest/
    function main () {
        // Diagnostics
        const diagnostics=document.getElementById("diagnostics");
        function addDiagnostic(type,other){
            if (type=="value"){
                const c = document.createElement("div");
                diagnostics.appendChild(c);
                return c;
            }
            else if (type=="button"){
                const c = document.createElement("button");
                c.innerText=other.title;
                c.addEventListener("click",other.function)
                diagnostics.appendChild(c);
                return c;
            }
        }
        const debug = {
            help:addDiagnostic("value"),
            framerate:addDiagnostic("value"),
            versionelement:addDiagnostic("value"),
            deltaelement:addDiagnostic("value")
        };
        getSWConst("version").then(version=>{
            debug.versionelement.innerHTML="version: "+version;
        })
        // Canvas
        const canvas=document.getElementById("game");
        const context=canvas.getContext('2d');
        // Resize Window
        let width=0;
        let height=0;
        function manageCanvas(){
            if (width!==manageCanvas.proposedwidth||height!==manageCanvas.proposedheight){
                width=manageCanvas.proposedwidth;
                height=manageCanvas.proposedheight;
                canvas.width=width;
                canvas.height=height;
            }
            context.clearRect(0, 0, canvas.width, canvas.height);
        }
        (function (){
            async function resize(){
                manageCanvas.proposedwidth=window.innerWidth;
                manageCanvas.proposedheight=window.innerHeight;
                await wait(1);
                manageCanvas.proposedwidth=window.innerWidth;
                manageCanvas.proposedheight=window.innerHeight;
            }
            manageCanvas.proposedwidth=0;
            manageCanvas.proposedheight=0;
            window.addEventListener("resize", resize);
            resize();
        })()
        // Timing
        function framerateupdate(currtime){
            framerateupdate.f+=1;
            const deltatime=currtime-framerateupdate.t2;
            
            framerateupdate.t2=currtime;
            if (framerateupdate.t2-framerateupdate.t1>500){
                debug.framerate.innerText="FPS: "+Math.round(1000*framerateupdate.f/(framerateupdate.t2-framerateupdate.t1));
                framerateupdate.t1=framerateupdate.t2;
                framerateupdate.f=0;
            }
            
            debug.deltaelement.innerText="DT"+Math.round(deltatime);
            return deltatime;
        }
        framerateupdate.t1=0;
        framerateupdate.t2=0;
        framerateupdate.f=0;
        // Input
        const inputhandlers=[];
        inputhandlers.push(InputHandler(["up","left","right","down","fire","select","start"]));
        inputhandlers[0].map("ArrowUp","up");
        inputhandlers[0].map("ArrowLeft","left");
        inputhandlers[0].map("ArrowRight","right");
        inputhandlers[0].map("ArrowDown","down");
        inputhandlers[0].map("Enter","start");
        inputhandlers[0].map("ShiftRight","select");
        inputhandlers[0].map("Slash","fire");
        inputhandlers.push(InputHandler(["up","left","right","down","fire","select","start"]));
        inputhandlers[1].map("KeyW","up");
        inputhandlers[1].map("KeyA","left");
        inputhandlers[1].map("KeyD","right");
        inputhandlers[1].map("KeyS","down");
        inputhandlers[1].map("KeyQ","fire");
        // Touches
        const TOUCHPADRADIUS=100;
        const TOUCHPADFIRERADIUS=33;
        let touchpad=false;
        (function (){
            const touchListener=TouchListener(canvas);
            touchListener.addEventListener('update',touch=>{
                if (touchpad){
                    inputhandlers[0].releaseAll(touch.identifier);
                    inputhandlers[1].releaseAll(touch.identifier);
                    
                    if (distanceWithin(touch.startX,touch.startY,TOUCHPADRADIUS,height-TOUCHPADRADIUS,TOUCHPADRADIUS)){
                        inputhandlers[0].press(["right","down","left","up"][vectorToPoles([touch.currentX-TOUCHPADRADIUS,touch.currentY-height+TOUCHPADRADIUS],4)],touch.identifier);
                        if (distanceWithin(touch.startX,touch.startY,TOUCHPADRADIUS,height-TOUCHPADRADIUS,TOUCHPADFIRERADIUS)){
                            inputhandlers[0].press("fire",touch.identifier);
                        }
                    }
                    if (distanceWithin(touch.startX,touch.startY,width-TOUCHPADRADIUS,height-TOUCHPADRADIUS,TOUCHPADRADIUS)){
                        inputhandlers[1].press(["right","down","left","up"][vectorToPoles([touch.currentX-width+TOUCHPADRADIUS,touch.currentY-height+TOUCHPADRADIUS],4)],touch.identifier);
                        if (distanceWithin(touch.startX,touch.startY,width-TOUCHPADRADIUS,height-TOUCHPADRADIUS,TOUCHPADFIRERADIUS)){
                            inputhandlers[1].press("fire",touch.identifier);
                        }
                    }
                }
            })
            touchListener.addEventListener('end',touch=>{
                inputhandlers[0].releaseAll(touch.identifier);
                inputhandlers[1].releaseAll(touch.identifier);
            })
            touchListener.addEventListener('taps',touch=>{
                if (touch.taps==3){
                    inputhandlers[0].once("start");
                }
            })
        })()
        // Joysticks
        let gamepads=navigator.getGamepads();
        function handleJoysticks(){
            gamepads=navigator.getGamepads();
            function joyMapping(mapping,gamepad,handler){
                for (let map of Object.keys(mapping)){
                    if (map<gamepad.buttons.length&&gamepad.buttons[map].pressed){
                        handler.press(mapping[map],"joystick")
                    }
                }
            }
            for (let i = 0; i < gamepads.length; i++) {
                if (gamepads[i]&&inputhandlers.length>i) {
                    inputhandlers[i].releaseAll("joystick");
                    const gamepad=gamepads[i];
                    const handler=inputhandlers[i];
                    switch (gamepads[i].id){
                        case "12bd-d015-2Axes 11Keys Game  Pad":{
                            // Same as next
                        }
                        case "2Axes 11Keys Game  Pad (Vendor: 12bd Product: d015)":{
                            joyMapping({
                                1:"fire",
                                9:"start",
                                8:"select"
                            },gamepad,handler);
                            if (Math.round(gamepad.axes[0])==-1){
                                handler.press("left","joystick");
                            }
                            if (Math.round(gamepad.axes[0])==1){
                                handler.press("right","joystick");
                            }
                            if (Math.round(gamepad.axes[1])==-1){
                                handler.press("up","joystick");
                            }
                            if (Math.round(gamepad.axes[1])==1){
                                handler.press("down","joystick");
                            }
                            break;
                        }
                        case "2Axes 11Keys Game  Pad":{
                            joyMapping({
                                12:"up",
                                13:"down",
                                14:"left",
                                15:"right",
                                8:"select",
                                9:"start",
                                1:"fire"
                            },gamepad,handler);
                            break;
                        }
                        default:{
                            //debug.help.innerText=JSON.stringify(gamepads[i].id);
                            joyMapping({
                                12:"up",
                                13:"down",
                                14:"left",
                                15:"right",
                                8:"select",
                                9:"start",
                                1:"fire"
                            },gamepad,handler);
                            if (Math.round(gamepad.axes[0])==-1){
                                handler.press("left","joystick");
                            }
                            if (Math.round(gamepad.axes[0])==1){
                                handler.press("right","joystick");
                            }
                            if (Math.round(gamepad.axes[1])==-1){
                                handler.press("up","joystick");
                            }
                            if (Math.round(gamepad.axes[1])==1){
                                handler.press("down","joystick");
                            }
                        }
                    }
                }
            }
        }
        // Frame handler
        function processFrame(currtime){
            const deltatime=framerateupdate(currtime);
            handleJoysticks();
            const inputs=[];
            for (let handler of inputhandlers){
                inputs.push(handler.getInput())
            }
            manageCanvas();
            logicLoop(deltatime,inputs);
            drawLoop();
            window.requestAnimationFrame(processFrame);
        }
        window.requestAnimationFrame(processFrame);
        // Images
        const images={};
        function addImage(name,extension){
            if (!extension){
                extension="webp"
            }
            const img=new Image();
            img.src="images/"+name+"."+extension;
            images[name]=img;
        }
        for (let name of ["bunnies","force_field","glow","grenade","grow","healthpack","heart","holy_grail","knight","logo","small","speed","thrown_grenade"]){
            addImage(name);
        }
        for (let name of ["black_hole","boom"]){
            addImage(name,"svg");
        }
        images.explosion=[]
        for (let frame=0;frame<26;frame++){
            const img=new Image();
            img.src="images/explosion/frame"+"0".repeat(2-(frame+"").length)+frame+".png";
            images.explosion.push(img);
        }
        // Videos
        const backgroundvideo = document.createElement("video");
        backgroundvideo.src="images/background.webm";
        backgroundvideo.loop=true;
        backgroundvideo.pause();
        // Sounds
        const sounds = {};
        function addSound(name){
            const sound=new Audio("sounds/"+name+".webm");
            sounds[name]=sound;
        }
        for (let name of ["background","dying_bunny","dying_knight","explosion","pull"]){
            addSound(name);
        }
        sounds.background.oncanplaythrough =function (){
            sounds.background.addEventListener("ended", function() { // repeat
                this.currentTime = 0;
                this.play();
                this.volume=.2;
            }, false);
            firstInteraction.then(()=>{
                sounds.background.play();
            })
        }
        // Elements
        const elements = {
            main_menu:document.getElementById("main_menu"),
            play:document.getElementById("play"),
            options:document.getElementById("options"),
            help:document.getElementById("help"),
            options_menu:document.getElementById("options_menu"),
            fullscreen:document.getElementById("fullscreen"),
            touch_controls:document.getElementById("touch_controls"),
            back:document.getElementById("back")
        };
        // Game State
        
        
        
        function drawPad(x,y){
            context.beginPath();
            context.arc(x,y,TOUCHPADRADIUS,0,2*Math.PI);
            context.fillStyle = "rgba(128,128,128,.33)";
            context.fill();
            context.beginPath();
            context.arc(x,y,TOUCHPADFIRERADIUS,0,2*Math.PI);
            context.fillStyle = "rgba(128,128,128,.33)";
            context.fill();
        }
        class Grenade {
            constructor() {
                // Center position
                this.x=Math.random()*width;
                this.y=Math.random()*height;
            }
            logic(deltatime,bunnies){
                for (let bunny of bunnies){
                    if (distanceWithin(this.x,this.y,bunny.x,bunny.y,50)){
                        if (bunny.give("grenade")){
                            return false;
                        }
                    }
                }
                return true;
            }
            draw(){
                const img=images.grenade;
                context.drawImage(img,this.x-img.width/2,this.y-img.height/2);
            }
        }
        class HealthPack {
            constructor() {
                // Center position
                this.x=Math.random()*width;
                this.y=Math.random()*height;
            }
            logic(deltatime,bunnies){
                for (let bunny of bunnies){
                    if (distanceWithin(this.x,this.y,bunny.x,bunny.y,50)){
                        if (bunny.life<4){
                            bunny.life+=1;
                        }
                        return false;
                    }
                }
                return true;
            }
            draw(){
                const img=images.healthpack;
                context.drawImage(img,this.x-img.width/2,this.y-img.height/2);
            }
        }
        class ForceField {
            constructor() {
                // Center position
                this.x=Math.random()*width;
                this.y=Math.random()*height;
            }
            logic(deltatime,bunnies){
                for (let bunny of bunnies){
                    if (distanceWithin(this.x,this.y,bunny.x,bunny.y,50)){
                        if (bunny.give("force_field")){
                            return false;
                        }
                    }
                }
                return true;
            }
            draw(){
                const img=images.force_field;
                context.drawImage(img,this.x-img.width/2,this.y-img.height/2);
            }
        }
        class Grow {
            constructor() {
                // Center position
                this.x=Math.random()*width;
                this.y=Math.random()*height;
            }
            logic(deltatime,bunnies){
                for (let bunny of bunnies){
                    if (distanceWithin(this.x,this.y,bunny.x,bunny.y,50)){
                        bunny.w=64;
                        bunny.h=64;
                        bunny.growTime=3000;
                        return false;
                    }
                }
                return true;
            }
            draw(){
                const img=images.grow;
                context.drawImage(img,this.x-img.width/2,this.y-img.height/2);
            }
        }
        class Knight {
            constructor() {
                // Center position
                this.x=Math.random()*width;
                this.y=Math.random()*height;
            }
            logic(deltatime,bunnies){
                for (let bunny of bunnies){
                    if (distanceWithin(this.x,this.y,bunny.x,bunny.y,50)){
                        bunny.points+=1;
                        return false;
                    }
                }
                return true;
            }
            draw(){
                const img=images.knight;
                context.drawImage(img,this.x-img.width/2,this.y-img.height/2);
            }
        }
        class Speed {
            constructor() {
                // Center position
                this.x=Math.random()*width;
                this.y=Math.random()*height;
            }
            logic(deltatime,bunnies){
                for (let bunny of bunnies){
                    if (distanceWithin(this.x,this.y,bunny.x,bunny.y,50)){
                        bunny.speed+=15/1000;
                        bunny.speedtime=2500;
                        return false;
                    }
                }
                return true;
            }
            draw(){
                const img=images.speed;
                context.drawImage(img,this.x-15,this.y-15,30,30);
            }
        }
        class BlackHole {
            constructor() {
                // Center position
                this.x=Math.random()*width;
                this.y=Math.random()*height;
            }
            logic(deltatime,bunnies){
                for (let bunny of bunnies){
                    if (distanceWithin(this.x,this.y,bunny.x,bunny.y,50)){
                        bunny.blackHoleTime=5000;
                        return false;
                    }
                }
                return true;
            }
            draw(){
                const img=images.black_hole;
                context.drawImage(img,this.x-25,this.y-25,50,50);
            }
        }
        class Boom {
            constructor() {
                // Center position
                this.x=Math.random()*width;
                this.y=Math.random()*height;
            }
            logic(deltatime,bunnies){
                for (let bunny of bunnies){
                    if (distanceWithin(this.x,this.y,bunny.x,bunny.y,50)){
                        for (let i=0;i<powerups.length; i++){
                            if (powerups[i] instanceof Grenade){
                                powerups[i]=new Explosion(powerups[i].x,powerups[i].y,bunny);
                            }
                        }
                        return false;
                    }
                }
                return true;
            }
            draw(){
                const img=images.boom;
                context.drawImage(img,this.x-25,this.y-25,50,50);
            }
        }
        class ThrownGrenade {
            constructor(x,y,orientation,time,bunny) {
                // Center position
                this.x=x;
                this.y=y;
                this.orientation=orientation;
                this.time=time;
                this.bunny=bunny;
            }
            logic(deltatime,bunnies){
                this.time-=deltatime;
                if (this.time<0){
                    powerups.push(new Explosion(this.x,this.y,this.bunny));
                    return false;
                }
                const amount=deltatime*2/10;
                switch (this.orientation){
                    case 0:{
                        this.y+=amount;
                        break;
                    }
                    case 1:{
                        this.x-=amount;
                        break;
                    }
                    case 2:{
                        this.x+=amount;
                        break;
                    }
                    case 3:{
                        this.y-=amount;
                        break;
                    }
                }
                this.x=mod(this.x,width);
                this.y=mod(this.y,height);
                return true;
            }
            draw(){
                const img=images.thrown_grenade;
                context.drawImage(img,this.x-img.width/2,this.y-img.height/2);
            }
        }
        class Explosion {
            constructor(x,y,bunny) {
                this.time=0;
                // Center position
                this.x=x;
                this.y=y;
                this.bunny=bunny;
                sounds.explosion.pause();
                sounds.explosion.currentTime=0;
                sounds.explosion.play();
            }
            logic(deltatime,bunnies){
                for (let bunny of bunnies){
                    if (distanceWithin(this.x,this.y,bunny.x,bunny.y,50)){
                        bunny.inflict(4,this.bunny)
                    }
                    else if (distanceWithin(this.x,this.y,bunny.x,bunny.y,100)){
                        bunny.inflict(3,this.bunny)
                    }
                    else if (distanceWithin(this.x,this.y,bunny.x,bunny.y,140)){
                        bunny.inflict(2,this.bunny)
                    }
                    else if (distanceWithin(this.x,this.y,bunny.x,bunny.y,180)){
                        bunny.inflict(1,this.bunny)
                    }
                }
                this.time+=deltatime;
                if (this.time>=1300){
                    return false;
                }
                return true;
            }
            draw(){
                const img=images.explosion[Math.floor(this.time/50)]
                context.drawImage(img,this.x-img.width/2,this.y-img.height/2);
            }
        }
        class Bunny { 
            constructor(look_index) {
                this.sx=(look_index%4)*3;
                this.sy=Math.floor(look_index/4)*4;
                this.x=Math.random()*width;
                this.y=Math.random()*height;
                this.w=32;
                this.h=32;
                this.frame=0;
                this.orientation=0; // down left right up
                this.speed=100/1000;
                this.pressedtime={down:0,right:0,left:0,up:0};
                this.inventory=[];
                this.life=4;
                this.recoverytime=0;
                this.points=0;
                this.holding=0;
                this.throwing=false;
                this.throwtime=0;
                this.speedtime=0;
                this.forceFieldTime=0;
                this.growTime=0;
                this.blackHoleTime=0;
            }
            give(item){
                if (this.inventory.length<3){
                    this.inventory.push(item);
                    return true;
                }
                return false;
            }
            inflict(damage,killer){
                if (this.recoverytime==0&&this.forceFieldTime==0){
                    this.life-=damage;
                    this.recoverytime=1000;
                    if (this.life<=0){
                        this.life=4;
                        this.x=Math.random()*width;
                        this.y=Math.random()*height;
                        this.inventory.length=0;
                        this.holding=0;
                        this.throwing=false;
                        this.throwtime=0;
                        this.speedtime=0;
                        this.forceFieldTime=0;
                        this.growTime=0;
                        this.blackHoleTime=0;
                        this.speed=100/1000;
                        this.w=32;
                        this.y=32;
                        sounds.dying_bunny.play()
                        if (killer!=this){
                            killer.points+=10;
                        }
                        this.points/=2;
                        this.points=Math.floor(this.points);

                    }
                }
            }
            logic(deltatime,input){
                const amount=(this.speed-14/1000*(4-this.life))*deltatime; // Total speed: this.speed is just initial plus speedups
                this.recoverytime-=deltatime;
                if (this.recoverytime<0){
                    this.recoverytime=0;
                }
                this.forceFieldTime-=deltatime;
                if (this.forceFieldTime<0){
                    this.forceFieldTime=0;
                }
                this.speedtime-=deltatime;
                if (this.speedtime<0){
                    this.speedtime=0;
                    this.speed=100/1000;
                }
                this.growTime-=deltatime;
                if (this.growTime<0){
                    this.growTime=0;
                    this.w=32;
                    this.h=32;
                }
                this.blackHoleTime-=deltatime;
                if (this.blackHoleTime<0){
                    this.blackHoleTime=0;
                }
                if (this.throwing){
                    this.throwtime-=deltatime;
                    if (this.throwtime<=0){
                        this.throwing=false;
                        powerups.push(new Explosion(this.x,this.y,this));
                    }
                }
                if (!input.current.fire&&this.throwing){
                    this.throwing=false;
                    powerups.push(new ThrownGrenade(this.x,this.y,this.orientation,this.throwtime,this));
                }
                this.frame+=amount/15;
                this.frame%=3;
                let lowest=9999999;
                const order=["down","left","right","up"];
                for (let i =0;i<4;i++){
                    if (input.current[order[i]]){
                        this.pressedtime[order[i]]+=deltatime;
                        if (this.pressedtime[order[i]]<lowest){
                            this.orientation=i;
                            lowest=this.pressedtime[order[i]];
                        }
                    }
                    else{
                        this.pressedtime[order[i]]=0;
                    }
                }
                if (this.inventory.length>0){
                    if (input.new.fire){
                        if (this.inventory[this.holding]=="grenade"){
                            this.throwing=true;
                            this.throwtime=3000;
                            sounds.pull.play();
                        }
                        else if (this.inventory[this.holding]=="force_field"){
                            this.forceFieldTime=3000;
                        }
                        this.inventory.splice(this.holding,1);
                    }
                    if (input.new.select){
                        this.holding+=1;
                    }
                    if (this.inventory.length>0){
                        this.holding%=this.inventory.length;
                    }
                }
                if (this.growTime>0){
                    for (let bunny of bunnies){
                        if (bunny.growTime==0&&distanceWithin(this.x,this.y,bunny.x,bunny.y,48)){
                            bunny.inflict(2,this);
                        }
                    }
                }
                if (this.blackHoleTime>0){
                    for (let powerup of powerups){
                        let aimx=0;
                        let aimy=0;
                        aimx=this.x;
                        aimy=this.y;
                        if (powerup.x-this.x>width/2){
                            aimx=this.x+width;
                        } 
                        if (powerup.y-this.y>height/2){
                            aimy=this.y+height;
                        }
                        if (this.x-powerup.x>width/2){
                            aimx=this.x-width;
                        }
                        if (this.y-powerup.y>height/2){
                            aimy=this.y-height;
                        }
                        const distance_squared=(aimx-powerup.x)**2+(aimy-powerup.y)**2;
                        if (distance_squared>0){
                            const direction=Math.atan2((aimy-powerup.y),(aimx-powerup.x));
                            let dx=1000*Math.cos(direction)*deltatime/distance_squared;
                            let dy=1000*Math.sin(direction)*deltatime/distance_squared;
                            if (Math.abs(dx)>Math.abs(this.x-powerup.x)){
                                dx=this.x-powerup.x;
                            }
                            if (Math.abs(dy)>Math.abs(this.y-powerup.y)){
                                dy=this.y-powerup.y;
                            }
                            powerup.x+=dx;
                            powerup.y+=dy;
                        }
                        powerup.x=mod(powerup.x,width);
                        powerup.y=mod(powerup.y,height);
                    }
                }
                switch (this.orientation){
                    case 0:{
                        this.y+=amount;
                        break;
                    }
                    case 1:{
                        this.x-=amount;
                        break;
                    }
                    case 2:{
                        this.x+=amount;
                        break;
                    }
                    case 3:{
                        this.y-=amount;
                        break;
                    }
                }
                this.x=mod(this.x,width);
                this.y=mod(this.y,height);
            }
            draw(){
                if (this.forceFieldTime>0){
                    context.drawImage(images.force_field,this.x-this.w/2-10,this.y-this.h/2-10,this.w+20,this.h+20);
                }
                context.drawImage(images.bunnies,(this.sx+Math.floor(this.frame))*32,(this.sy+Math.floor(this.orientation))*32,32,32,this.x-this.w/2,this.y-this.h/2,this.w,this.h);
                for (let i=0;i<this.life;i++){
                    context.drawImage(images.heart,this.x+10*i-this.w/2,this.y-25);
                }
                if (this.inventory.length>0&&this.holding<this.inventory.length){
                    context.drawImage(images[this.inventory[this.holding]],this.x+this.w/2,this.y-this.h/2,15,15);
                }
                context.font = '32px sans-serif';
                context.fillStyle='black'
                context.fillText(this.points, this.x-this.w/2, this.y-this.h/2-10);
            }
        }
        let state="menu";
        const bunnies=[]
        let taborder=[];
        function tabForward(){
            taborder[(taborder.indexOf(document.activeElement)+1)%taborder.length].focus();
        }
        function tabBackward(){
            taborder[mod((taborder.indexOf(document.activeElement)-1),taborder.length)].focus();
        }
        function setTabOrder(list){
            taborder=list;
            list[0].focus();
        }
        async function setState(newstate){
            await wait(1);
            state=newstate;
            if (state=="menu"||state=="options"){
                backgroundvideo.play();
            }
            else{
                backgroundvideo.pause();
            }
            elements.main_menu.style.display=state=="menu"?"block":"none";
            elements.options_menu.style.display=state=="options"?"block":"none";
            if (state=="menu"){
                setTabOrder([elements.play,elements.options,elements.help]);
            }
            if (state=="options"){
                setTabOrder([elements.fullscreen,elements.touch_controls,elements.back]);
            }
            // Player managment
            gamepads=navigator.getGamepads();
            while (inputhandlers.length>2){
                inputhandlers.pop();
            }
            for (let i=0;i<gamepads.length-2;i++){
                if (gamepads[i]!=undefined){
                    inputhandlers.push(InputHandler(["up","left","right","down","fire","select","start"]));
                }
            }
            bunnies.length=0;
            for (let i=0;i<inputhandlers.length;i++){
                bunnies.push(new Bunny(i));
            }
            console.log(gamepads.length,inputhandlers.length)
        }
        setState("menu");
        elements.play.addEventListener("click",()=>{
            setState("playing");
            console.log("playnig");
        })
        elements.options.addEventListener("click",()=>{
            setState("options");
        })
        elements.back.addEventListener("click",()=>{
            setState("menu");
            console.log("menu")
        })
        elements.fullscreen.addEventListener("change",()=>{
            if(elements.fullscreen.checked){
                openFullscreen(document.body);
            }
            else{
                closeFullscreen();
            }
        })
        
        elements.touch_controls.addEventListener("change",()=>{
            touchpad=elements.touch_controls.checked;
        })
        let powerups = [];
        function spawnPowerUps(deltatime){
            spawnPowerUps.logicaltime+=deltatime;
            while (spawnPowerUps.logicaltime>50){
                spawnPowerUps.logicaltime -= 50;
                if (Math.random()<bunnies.length/200){
                    powerups.push(new Grenade());
                }
                if (Math.random()<bunnies.length/300){
                    powerups.push(new HealthPack());
                }
                if (Math.random()<bunnies.length/20){
                    powerups.push(new Speed());
                }
                if (Math.random()<bunnies.length/50){
                    powerups.push(new Knight());
                }
                if (Math.random()<bunnies.length/300){
                    powerups.push(new ForceField());
                }
                if (Math.random()<bunnies.length/300){
                    powerups.push(new Grow());
                }
                if (Math.random()<bunnies.length/100){
                    powerups.push(new BlackHole());
                }
                if (Math.random()<bunnies.length/1000){
                    powerups.push(new Boom());
                }
            } 
        }
        spawnPowerUps.logicaltime=0;
        function logicLoop(deltatime,inputs){
            const newcontrol=inputs[0].new;
            if (state=="playing"){
                spawnPowerUps(deltatime);
                if (newcontrol.start){
                    setState("menu");
                }
                
                let i=0;
                while (i<powerups.length){
                    if(powerups[i].logic(deltatime,bunnies)){
                        i+=1;
                    }
                    else{
                        powerups.splice(i,1);
                    }
                }
                for (let i=0;i<bunnies.length;i++){
                    bunnies[i].logic(deltatime,inputs[i]);
                }
            }
            else{
                if (newcontrol.select||newcontrol.down){
                    tabForward();
                }
                if (newcontrol.up){
                    tabBackward();
                }
                if (newcontrol.start){
                    document.activeElement.click();
                    console.log("click")
                }
            }
        }
        function drawLoop(){
            switch (state){
            case "options":
            case "menu":{
                // Draw background
                context.drawImage(backgroundvideo,0,0,width,height);
                break;
            }
            case "playing":{
                // Draw background
                context.fillStyle = "#78c380";
                context.fillRect(0, 0, canvas.width, canvas.height);
                // Draw Bunnies
                
                for (let i=0;i<powerups.length;i++){
                    powerups[i].draw();
                }
                for (let i=0;i<bunnies.length;i++){
                    bunnies[i].draw();
                }
                
                break;
            }
            }
            if (touchpad){
                // Draw touch pad
                drawPad(TOUCHPADRADIUS,height-TOUCHPADRADIUS);
                drawPad(width-TOUCHPADRADIUS,height-TOUCHPADRADIUS);
            }
        }
        
    }
    main();
})()
