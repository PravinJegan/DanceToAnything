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

posetracker();


const drawingUtils = new DrawingUtils(canvasCtx);

async function drawbones() {

    line_overlay.width = video.videoWidth;
    line_overlay.height = video.videoHeight;


    let time = performance.now();

    if (lastVideoTime !== video.currentTime){ // to double check that it isn the same frame as last time 
        lastVideoTime = video.currentTime;

        poseLandmarker.detectForVideo(video,time, (result) => {
            
            canvasCtx.clearRect(0, 0, line_overlay.width, line_overlay.length) //clears canves before next lien
            
            if (result.landmarks){ //this is drawig the connecters and points based on connectons
                for (const landmark of result.landmarks){
                    drawingUtils.drawConnectors(landmark, PoseLandmarker.POSE_CONNECTIONS /* PoseLandmarker is capital becase POSE_CONNECTIONS just tells what pots are connected to what */, {color: "Blue", lineWidth : 4})
                    drawingUtils.drawLandmarks(landmark, {color: "Red", radius : 5})
                    
                }
            }
        })
    }
    window.requestAnimationFrame(drawbones) //this is asking the javascrpit bofre next computer diplay frame draw the things that need to be drawn so its only doing it for the refresh rate

}