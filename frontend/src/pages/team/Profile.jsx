import React, { useState, useEffect } from 'react';
import { Card, Loader } from '../../components/ui/Components';
import { User, Shield } from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import api from '../../utils/api';

const Profile = () => {
  const { addToast } = useToast();
  const [team, setTeam] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTeamProfile = async () => {
      try {
        const res = await api.get('/team/me');
        setTeam(res.data);
      } catch (error) {
        addToast("Failed to fetch team profile", "error");
      } finally {
        setLoading(false);
      }
    };
    fetchTeamProfile();
  }, [addToast]);

  if (loading) return <Loader />;
  if (!team) return <div className="text-white text-center p-8">Profile unavailable.</div>;

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
      <h1 className="text-3xl font-bold text-white">Team Dossier</h1>
      
      <Card>
        <div className="flex items-center gap-4 mb-6 border-b border-zinc-800 pb-6">
          <div className="w-16 h-16 bg-red-600 rounded-full flex items-center justify-center text-2xl font-bold text-white shrink-0">
            {team.team_name.charAt(0).toUpperCase()}
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white">{team.team_name}</h2>
            <p className="text-zinc-500 font-mono">
              Team ID: <span className="text-red-500">#{team.team_id}</span> | Week: {team.week_number}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div>
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <User size={18} /> Roster
            </h3>
            <div className="space-y-3">
              {/* Leader Box */}
              {team.leader && (
                <div className="bg-red-900/10 p-3 rounded border border-red-900/30">
                  <div className="flex justify-between items-start mb-1">
                    <span className="text-red-500 font-bold flex items-center gap-2">
                      {team.leader.name} <span className="text-[10px] bg-red-600 text-white px-1.5 py-0.5 rounded">LEADER</span>
                    </span>
                  </div>
                  <p className="text-zinc-400 text-xs mb-1">{team.leader.email} | {team.leader.phone || 'No Phone'}</p>
                  <p className="text-zinc-500 text-xs font-mono">
                    {team.leader.academic_year || 'N/A'} - {team.leader.department || 'N/A'}
                  </p>
                </div>
              )}

              {/* Members Box */}
              {team.members && team.members.map((m, i) => (
                <div key={i} className="bg-zinc-900 p-3 rounded border border-zinc-800">
                  <span className="text-zinc-300 font-medium block mb-1">{m.name}</span>
                  <p className="text-zinc-500 text-xs mb-1">{m.email}</p>
                  <p className="text-zinc-600 text-xs font-mono">
                    {m.academic_year || 'N/A'} - {m.department || 'N/A'}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <Shield size={18} /> Oversight
            </h3>
            <div className="bg-blue-900/10 border border-blue-900/30 p-4 rounded">
              <p className="text-zinc-400 text-sm mb-1">Assigned Coordinator</p>
              <p className="text-blue-400 font-bold text-lg">
                Verified System Coordinator
              </p>
              <p className="text-blue-900/70 text-xs mt-1">Your team has been automatically assigned to a coordinator for task verification.</p>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default Profile;