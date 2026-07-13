import{
    PoseLandmarker,
    FilesetResolver,
    DrawingUtils,
} from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest";

const video = document.getElementById('camera');
const line_overlay = document.getElementById('line_overlay');

const canvasCtx = line_overlay.getContext('2d');

let poseLandmarker;
let runningMode = "LIVE_STREAM";
let lastVideoTime = -1;
let peopleCount = 1;
let personNum = 1;


posetracker();
let player_all = [];
/*setInterval(() => {
    console.log(player_all);
}, 1000);*/

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
    video.addEventListener("loadeddata", drawbones) // It just saying right after we get the video to do the ai over lay draw bones iswhats gonna draw bones 

});

}

async function drawbones() {

    if (line_overlay.width !== video.videoWidth) {
    line_overlay.width = video.videoWidth;
    line_overlay.height = video.videoHeight;
}


    let time = performance.now();

    if (lastVideoTime !== video.currentTime)
        { // to double check that it isn the same frame as last time 
        lastVideoTime = video.currentTime;

        poseLandmarker.detectForVideo(video,time, (result) => {
            
            canvasCtx.clearRect(0, 0, line_overlay.width, line_overlay.height) //clears canves before next lien
            
            if (result.landmarks){ //this is drawig the connecters and points based on connectons
                for (const landmark of result.landmarks){
                    drawingUtils.drawConnectors(landmark, PoseLandmarker.POSE_CONNECTIONS /* PoseLandmarker is capital becase POSE_CONNECTIONS just tells what pots are connected to what */, {color: "Blue", lineWidth : 4});
                    drawingUtils.drawLandmarks(landmark, {color: "Red", radius : 5});
                    //this is going to be for speficly the right arm
                    let player_frame = [
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

                //player_all.push(player_frame);
                //console.log("angles:", player_frame);
                }
            }
        })
    }
    
    window.requestAnimationFrame(drawbones) //this is asking the javascrpit bofre next computer diplay frame draw the things that need to be drawn so its only doing it for the refresh rate

}
 
