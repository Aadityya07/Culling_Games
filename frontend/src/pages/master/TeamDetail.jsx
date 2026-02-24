import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Card, Loader } from '../../components/ui/Components';
import { ArrowLeft, User, Shield, Trophy } from 'lucide-react';
import api from '../../utils/api';
import { useToast } from '../../context/ToastContext';

const TeamDetail = () => {
  const { id } = useParams();
  const { addToast } = useToast();
  const [team, setTeam] = useState(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    const fetchTeamDetail = async () => {
      try {
        const res = await api.get(`/admin/team/${id}`);
        setTeam(res.data);
      } catch (error) {
        addToast(error.response?.data?.error || "Failed to load team details", "error");
      } finally {
        setLoading(false);
      }
    };
    fetchTeamDetail();
  }, [id, addToast]);

  if (loading) return <Loader />;
  if (!team) return <div className="p-8 text-white text-center">Team not found.</div>;

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl mx-auto">
      <Link to="/master/teams" className="text-zinc-500 hover:text-white flex items-center gap-2 mb-4">
        <ArrowLeft size={18} /> Back to Teams
      </Link>

      <div className="flex justify-between items-start">
        <div>
            <h1 className="text-3xl font-bold text-white mb-1">{team.team_name}</h1>
            <p className="text-zinc-500 text-sm font-mono">Team ID: <span className="text-red-500">#{team.team_id}</span></p>
        </div>
        <div className={`px-3 py-1 rounded font-bold text-sm ${team.is_disqualified ? 'bg-red-900/30 text-red-500' : 'bg-green-900/30 text-green-500'}`}>
            {team.is_disqualified ? 'DISQUALIFIED' : 'ACTIVE'}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="text-center">
            <Trophy className="mx-auto text-yellow-500 mb-2" />
            <h2 className="text-3xl font-bold text-white">{team.total_points}</h2>
            <p className="text-zinc-500 text-xs">Total Points</p>
        </Card>
        <Card className="text-center">
            <h2 className="text-3xl font-bold text-blue-500">{team.weekly_points}</h2>
            <p className="text-zinc-500 text-xs">Weekly Points (Week {team.week_number})</p>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card title="Personnel">
            <div className="space-y-4">
                <div className="bg-red-900/10 p-3 rounded border border-red-900/30">
                    <p className="text-white font-bold mb-1">{team.leader.name} <span className="text-[10px] bg-red-600 text-white px-1.5 py-0.5 rounded ml-2">LEADER</span></p>
                    <p className="text-zinc-400 text-xs mb-1">{team.leader.email} | {team.leader.phone || 'No Phone'}</p>
                    <p className="text-zinc-500 text-xs font-mono">{team.leader.academic_year || 'N/A'} - {team.leader.department || 'N/A'}</p>
                </div>
                {team.members && team.members.map((m, i) => (
                    <div key={i} className="bg-zinc-900 p-3 rounded border border-zinc-800">
                        <p className="text-zinc-300 font-medium mb-1">{m.name}</p>
                        <p className="text-zinc-500 text-xs mb-1">{m.email}</p>
                        <p className="text-zinc-600 text-xs font-mono">{m.academic_year || 'N/A'} - {m.department || 'N/A'}</p>
                    </div>
                ))}
            </div>
        </Card>

        <Card title="Oversight">
            <div className="flex items-center gap-3 bg-blue-900/10 p-4 rounded border border-blue-900/30">
                <Shield className="text-blue-500" size={24} />
                <div>
                    <p className="text-blue-400 font-bold">{team.coordinator?.name || "Unassigned"}</p>
                    <p className="text-blue-900/70 text-xs">{team.coordinator?.email || "No email"}</p>
                </div>
            </div>
        </Card>
      </div>
    </div>
  );
};

export default TeamDetail;