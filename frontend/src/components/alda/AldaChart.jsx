import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

const EMOJI_CONFIG = [
  { key: '알다-칭찬',  label: '칭찬',  color: '#F59E0B' },
  { key: '알다-신뢰',  label: '신뢰',  color: '#3B82F6' },
  { key: '알다-주도성', label: '주도성', color: '#8B5CF6' },
  { key: '알다-원팀',  label: '원팀',  color: '#10B981' },
];

const OPTIONS = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
    tooltip: {
      callbacks: {
        label: (ctx) => ` ${ctx.parsed.y}건`,
      },
    },
  },
  scales: {
    y: {
      beginAtZero: true,
      ticks: { stepSize: 1, precision: 0 },
      grid: { color: '#F1F5F9' },
    },
    x: { grid: { display: false } },
  },
};

export default function AldaChart({ byEmoji = {} }) {
  const data = {
    labels: EMOJI_CONFIG.map((e) => e.label),
    datasets: [
      {
        data: EMOJI_CONFIG.map((e) => byEmoji[e.key] ?? 0),
        backgroundColor: EMOJI_CONFIG.map((e) => e.color),
        borderRadius: 6,
        borderSkipped: false,
      },
    ],
  };

  return <Bar data={data} options={OPTIONS} />;
}
