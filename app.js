import{
    PoseLandmarker,
    FilesetResolver,
    DrawingUtils,
} from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest";

const video = document.getElementById('camera');
const line_overlay = document.getElementById('line_overlay');

const canvasCtx = line_overlay.getContext('2d');

let poseLandmarker;
let runningMode = "VIDEO";
let lastVideoTime = -1;
let peopleCount = 1;
let personNum = 1;


posetracker();
let player_all = [];

const drawingUtils = new DrawingUtils(canvasCtx);


async function posetracker() {
    const vision = await FilesetResolver.forVisionTasks("https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
    );
    poseLandmarker = await PoseLandmarker.createFromOptions(vision, {
        baseOptions: {
            modelAssetPath: "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task",
            delegate: "GPU"
        },
        runningMode: runningMode,
        numPoses: peopleCount
    });

    console.log("AI Model has been loade from online");

    startcamera();
}

function startcamera(){
navigator.mediaDevices.getUserMedia({ video: true }).then((stream) => {
    video.srcObject = stream;
    video.addEventListener("loadeddata", () => // arrow fuction so it satrts intvar only after drabones happens which only happens after the video loads 
        {
            
        drawbones(player_all) // It just saying right after we get the video to do the ai over lay draw bones iswhats gonna draw bones need parnetese
        
        setInterval(() => 
            { // just to print out all the sciore for each fram to make sure running at 30 frames 
        console.log(player_all);
            }, 1000);
    }) 
    
    
    
});

}


const frame_time = 1000/30;
let lastDrawTime = performance.now();
async function drawbones(player_array) {

    window.requestAnimationFrame( ()=> {drawbones(player_array)})//this is asking the javascrpit bofre next computer diplay frame draw the things that need to be drawn so its only doing it for the refresh rate

    if (line_overlay.width !== video.videoWidth) {
    line_overlay.width = video.videoWidth;
    line_overlay.height = video.videoHeight;
}

    if (video.readyState < 2) { //if video not on dont start 
    return; 
}

    let time = performance.now();
    let time_since = time - lastDrawTime;

    if (time_since > frame_time)
        { 
        lastDrawTime = time - (time_since % frame_time);

        poseLandmarker.detectForVideo(video,time, (result) => {
            
            canvasCtx.clearRect(0, 0, line_overlay.width, line_overlay.height) //clears canves before next lien
            
            let player_frame = [null,null,null,null,null,null,null,null,null,null]

            if (result.landmarks){ //this is drawig the connecters and points based on connectons
                for (const landmark of result.landmarks){
                    drawingUtils.drawConnectors(landmark, PoseLandmarker.POSE_CONNECTIONS /* PoseLandmarker is capital becase POSE_CONNECTIONS just tells what pots are connected to what */, {color: "Blue", lineWidth : 4});
                    drawingUtils.drawLandmarks(landmark, {color: "Red", radius : 5});
                    //this is going to be for speficly the right arm
                    player_frame = [
                    /* 0 right forearm     */Math.atan2(landmark[14].y - landmark[16].y, landmark[14].x - landmark[16].x),
                    /* 1 right upper arm   */Math.atan2(landmark[12].y - landmark[14].y, landmark[12].x - landmark[14].x),
                    /* 2 right body        */Math.atan2(landmark[24].y - landmark[12].y, landmark[24].x - landmark[12].x),
                    /* 3 right upper leg   */Math.atan2(landmark[24].y - landmark[26].y, landmark[24].x - landmark[26].x),
                    /* 4 right lower leg   */Math.atan2(landmark[26].y - landmark[28].y, landmark[26].x - landmark[28].x),
                    /* 5 left forearm      */Math.atan2(landmark[13].y - landmark[15].y, landmark[13].x - landmark[15].x),
                    /* 6 left upper arm    */Math.atan2(landmark[11].y - landmark[13].y, landmark[11].x - landmark[13].x),
                    /* 7 left body         */Math.atan2(landmark[23].y - landmark[11].y, landmark[23].x - landmark[11].x),
                    /* 8 left upper leg    */Math.atan2(landmark[23].y - landmark[25].y, landmark[23].x - landmark[25].x),
                    /* 9 left lower leg    */Math.atan2(landmark[25].y - landmark[27].y, landmark[25].x - landmark[27].x),
                ];
                //console.log("angles:", player_frame);
                }
            }
            player_array.push(player_frame);
        })
    }
    
}
 
