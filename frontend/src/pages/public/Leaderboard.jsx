import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Trophy } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Loader } from '../../components/ui/Components';
import { useToast } from '../../context/ToastContext';
import api from '../../utils/api';

const Leaderboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth(); 
  const { addToast } = useToast();

  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        const res = await api.get('/team/leaderboard');
        setTeams(res.data);
      } catch (error) {
        addToast("Failed to fetch live leaderboard data", "error");
      } finally {
        setLoading(false);
      }
    };
    fetchLeaderboard();
  }, [addToast]);

  const handleBack = () => {
    navigate(-1); 
  };

  if (loading) return <Loader />;

  return (
    <div className="min-h-screen bg-black text-white p-6 md:p-12">
      <button onClick={handleBack} className="flex items-center gap-2 mb-8 text-zinc-500 hover:text-white transition-colors cursor-pointer">
        <ArrowLeft size={20} /> Back
      </button>
      
      <div className="max-w-5xl mx-auto animate-fade-in">
        <h1 className="text-4xl md:text-5xl font-black text-center mb-12 text-red-600 tracking-tighter flex items-center justify-center gap-4">
          <Trophy size={40} className="text-yellow-500" /> GLOBAL LEADERBOARD
        </h1>
        
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden shadow-xl shadow-red-900/10">
          
          {/* TABLE HEADER */}
          <div className="grid grid-cols-12 bg-zinc-950 p-4 text-xs font-bold text-zinc-500 uppercase tracking-wider border-b border-zinc-800">
            <div className="col-span-2 text-center">Rank</div>
            <div className="col-span-5 text-left pl-4">Team & Leader</div>
            <div className="col-span-3 text-center">Weekly Progress</div>
            <div className="col-span-2 text-center">Total Pts</div>
          </div>
          
          {teams.length === 0 ? (
            <div className="p-12 text-center text-zinc-500 italic border-t border-zinc-800">
              No active teams on the board yet.
            </div>
          ) : (
            teams.map((team, index) => {
              // Calculate weekly cap percentage for visual bar
              const capPercent = Math.min((team.weekly_points / team.weekly_cap) * 100, 100) || 0;

              return (
                <div key={team.rank} className={`grid grid-cols-12 p-4 items-center border-b border-zinc-800/50 hover:bg-zinc-800/30 transition-colors ${index === 0 ? 'bg-yellow-900/5' : ''}`}>
                  
                  {/* RANK */}
                  <div className="col-span-2 text-center font-mono font-bold text-lg text-zinc-500 flex justify-center">
                    {index === 0 ? <span className="text-2xl" title="1st Place">🥇</span> : 
                     index === 1 ? <span className="text-xl" title="2nd Place">🥈</span> : 
                     index === 2 ? <span className="text-xl" title="3rd Place">🥉</span> : 
                     `#${team.rank}`}
                  </div>
                  
                  {/* TEAM INFO & ID & LEADER EMAIL */}
                  <div className="col-span-5 pl-4 overflow-hidden">
                    <div className="flex items-center gap-2">
                      <span className={`font-bold text-lg truncate ${index === 0 ? 'text-yellow-500' : 'text-zinc-200'}`}>
                        {team.team_name}
                      </span>
                      <span className="text-red-500 text-xs font-mono bg-red-900/20 px-1.5 py-0.5 rounded border border-red-900/50 shrink-0">
                        #{team.team_id}
                      </span>
                    </div>
                    <div className="text-xs text-zinc-500 truncate mt-0.5" title={team.leader_email}>
                      {team.leader_email}
                    </div>
                  </div>

                  {/* WEEKLY POINTS & CAP */}
                  <div className="col-span-3 px-4">
                    <div className="flex justify-between items-center text-xs mb-1">
                      <span className="font-bold text-blue-400">{team.weekly_points} pts</span>
                      <span className="text-zinc-600">/ {team.weekly_cap} cap</span>
                    </div>
                    <div className="w-full bg-zinc-950 rounded-full h-1.5 overflow-hidden">
                      <div className="bg-blue-600 h-full rounded-full" style={{ width: `${capPercent}%` }}></div>
                    </div>
                  </div>
                  
                  {/* TOTAL POINTS */}
                  <div className="col-span-2 text-center font-bold text-white text-xl font-mono">
                    {team.total_points}
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  );
};

export default Leaderboard;