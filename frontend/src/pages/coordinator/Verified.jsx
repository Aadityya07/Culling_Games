import React, { useState, useEffect } from 'react';
import { Card, Loader } from '../../components/ui/Components';
import { useToast } from '../../context/ToastContext';
import api from '../../utils/api';

const Verified = () => {
  const { addToast } = useToast();
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const res = await api.get('/submissions/coordinator-history');
        setHistory(res.data);
      } catch (error) {
        addToast("Failed to fetch verification history", "error");
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();
  }, [addToast]);

  if (loading) return <Loader />;

  return (
    <div className="space-y-6 animate-fade-in">
      <h1 className="text-3xl font-bold text-white mb-6">Verification History</h1>
      <div className="bg-zinc-950 border border-zinc-800 rounded-lg overflow-hidden overflow-x-auto">
        <table className="w-full text-left whitespace-nowrap">
          <thead className="bg-zinc-900 text-zinc-400 text-xs uppercase">
            <tr>
              <th className="p-4">Submission ID</th>
              <th className="p-4">Team</th>
              <th className="p-4">Task</th>
              <th className="p-4">Date</th>
              <th className="p-4">Verdict</th>
              <th className="p-4 text-right">Points</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800">
            {history.length === 0 && (
              <tr>
                <td colSpan="6" className="p-8 text-center text-zinc-500 italic">
                  You have not verified any submissions yet.
                </td>
              </tr>
            )}
            {history.map(h => (
              <tr key={h.id} className="text-zinc-300 hover:bg-zinc-900/50">
                <td className="p-4 text-zinc-500 font-mono">#{h.id}</td>
                <td className="p-4 font-bold">{h.team_name}</td>
                <td className="p-4 text-zinc-400">{h.task_name}</td>
                <td className="p-4 text-zinc-500">{new Date(h.created_at).toLocaleString()}</td>
                <td className="p-4">
                  <span className={`px-2 py-1 rounded text-xs font-bold ${
                    h.status === 'VERIFIED' || h.status === 'APPROVED' ? 'bg-blue-900/30 text-blue-500' : 'bg-red-900/30 text-red-500'
                  }`}>
                    {h.status === 'APPROVED' ? 'VERIFIED (APPROVED)' : h.status}
                  </span>
                </td>
                <td className="p-4 text-right font-mono font-bold text-white">{h.points_awarded || 0}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Verified;