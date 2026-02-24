import * as faceapi from 'face-api.js';

const MODEL_URL = 'https://justadudewhohacks.github.io/face-api.js/models';

export async function loadModels() {
  await Promise.all([
    faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL),
    faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
    faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
  ]);
}

export async function getFaceDescriptor(imageElement: HTMLVideoElement | HTMLImageElement | HTMLCanvasElement) {
  const detection = await faceapi
    .detectSingleFace(imageElement)
    .withFaceLandmarks()
    .withFaceDescriptor();
  
  return detection?.descriptor;
}

export function createFaceMatcher(students: any[]) {
  const labeledDescriptors = students.map(student => {
    const descriptor = new Float32Array(JSON.parse(student.face_descriptor));
    return new faceapi.LabeledFaceDescriptors(student.id.toString(), [descriptor]);
  });
  
  return new faceapi.FaceMatcher(labeledDescriptors, 0.6);
}
