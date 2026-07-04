// Static smoke test — run with: node --import tsx/esm server/test-static.ts
import 'dotenv/config';
import { buildDeck } from './tools/jspm/internship-ppt-creator/ppt/buildDeck.js';
import fs from 'fs';

const DUMMY_OUTLINE = {
  introduction: [
    'Machine learning enables computers to learn from data without explicit programming',
    'Predictive maintenance uses ML to forecast equipment failures before they occur',
    'Reduces downtime and maintenance costs in industrial settings significantly',
    'Combines sensor data, historical records, and real-time monitoring',
    'Growing adoption in manufacturing, aviation, and energy sectors',
  ],
  objectives: [
    'Understand ML algorithms applicable to time-series sensor data analysis',
    'Collect and preprocess vibration, temperature, and pressure sensor datasets',
    'Train classification models to detect anomalies in equipment behavior',
    'Deploy a lightweight inference pipeline for real-time monitoring',
    'Evaluate model accuracy against historical failure records',
  ],
  modules: [
    {
      title: 'Data Collection & Preprocessing',
      bullets: [
        'Gather multi-sensor data from industrial equipment over 6 months',
        'Handle missing values using interpolation and forward-fill techniques',
        'Normalize features to unit scale for model compatibility',
        'Segment time-series into sliding windows of 100 data points',
        'Label anomaly windows using historical maintenance logs',
      ],
    },
    {
      title: 'Model Training & Evaluation',
      bullets: [
        'Compare Random Forest, LSTM, and Isolation Forest algorithms',
        'Use 80/20 train-test split with cross-validation for robustness',
        'Optimize hyperparameters via grid search for best F1-score',
        'Achieve 94% accuracy on test dataset with LSTM network',
      ],
    },
  ],
  architecture: [
    'Sensor layer: IoT devices collect real-time vibration and thermal data',
    'Data pipeline: Apache Kafka streams data to cloud storage bucket',
    'Preprocessing service: cleans and windows data before inference',
    'ML inference engine: LSTM model served via FastAPI REST endpoint',
    'Dashboard: Grafana displays live alerts and trend visualizations',
  ],
  resultsAndObservations: [
    'Model detected 89% of failures 48 hours before occurrence on test set',
    'False positive rate reduced to 6% after threshold calibration',
    'Average inference latency under 120ms suitable for real-time use',
    'Cost savings of ~30% projected compared to scheduled maintenance',
  ],
  advantages: [
    'Prevents unplanned downtime, saving significant operational costs',
    'Learns patterns specific to individual machines over time',
    'Scalable across multiple equipment types with transfer learning',
  ],
  limitations: [
    'Requires large labeled historical dataset for initial training',
    'Model performance degrades if sensor calibration drifts',
    'High initial setup cost for IoT sensor infrastructure',
  ],
  conclusion: [
    'ML-based predictive maintenance delivers measurable operational ROI',
    'LSTM networks outperform traditional threshold-based monitoring',
    'System is production-ready with minor infrastructure investment',
    'Future work: extend to multi-site deployment and edge inference',
  ],
};

const buffer = await buildDeck(
  {
    internshipTitle: 'Machine Learning for Predictive Maintenance',
    studentName: 'Jane Doe',
    prn: '2023001234',
    classDiv: 'TY-B',
    program: 'B.Tech TY – CSE',
  },
  DUMMY_OUTLINE,
);

fs.writeFileSync('test-output.pptx', buffer);
console.log(`✅ Generated test-output.pptx (${buffer.byteLength} bytes)`);
console.log('Open test-output.pptx in PowerPoint to verify layout.');
