import React, { useState, useEffect } from 'react';
import { Card, Button, Loader } from '../../components/ui/Components';
import { Shield, AlertCircle, RefreshCcw, Eye, Key, Search, Plus, X } from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import { Link } from 'react-router-dom';
import api from '../../utils/api';
import { useAuth } from '../../context/AuthContext';

const Teams = () => {
  const { addToast } = useToast();
  const { user } = useAuth(); 
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);

  // Dynamic Password Override State
  const [overrides, setOverrides] = useState([{ id: Date.now(), team_id: '', new_password: '' }]);
  const [isResetting, setIsResetting] = useState(false);

  const isSuperAdmin = user?.email === 'uzumakiaditya433@gmail.com';

  const fetchTeams = async () => {
    try {
      const res = await api.get('/admin/teams');
      setTeams(res.data);
    } catch (error) {
      addToast("Failed to load teams", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTeams();
  }, []);

  const handleDisqualify = async (id) => {
    const reason = window.prompt("Enter reason for disqualification:");
    if (!reason) return; 

    try {
      await api.post('/admin/disqualify-team', { team_id: id, reason });
      addToast("Team disqualified successfully", "success");
      fetchTeams(); 
    } catch (error) {
      addToast(error.response?.data?.error || "Failed to disqualify team", "error");
    }
  };

  const handleRequalify = async (id) => {
    if (!window.confirm("Are you sure you want to requalify this team?")) return;

    try {
      await api.post('/admin/requalify-team', { team_id: id });
      addToast("Team requalified successfully", "success");
      fetchTeams(); 
    } catch (error) {
      addToast(error.response?.data?.error || "Failed to requalify team", "error");
    }
  };

  // Multiple Row Handlers
  const handleAddRow = () => {
    setOverrides([...overrides, { id: Date.now(), team_id: '', new_password: '' }]);
  };

  const handleRemoveRow = (idToRemove) => {
    if (overrides.length > 1) {
      setOverrides(overrides.filter(row => row.id !== idToRemove));
    }
  };

  const handleOverrideChange = (id, field, value) => {
    setOverrides(overrides.map(row => (row.id === id ? { ...row, [field]: value } : row)));
  };

  const handlePasswordReset = async (e) => {
    e.preventDefault();
    
    // Filter out rows that are empty
    const validUpdates = overrides.filter(row => row.team_id.trim() !== '' && row.new_password.trim() !== '');

    if (validUpdates.length === 0) {
      addToast("Please fill in at least one Team ID and Password.", "error");
      return;
    }

    const tooShort = validUpdates.some(row => row.new_password.length < 6);
    if (tooShort) {
      addToast("All new passwords must be at least 6 characters long.", "error");
      return;
    }

    setIsResetting(true);
    try {
      const res = await api.post('/admin/change-team-password', {
        updates: validUpdates
      });
      addToast(res.data.message, "success");
      
      // Reset the form back to one empty row
      setOverrides([{ id: Date.now(), team_id: '', new_password: '' }]);
    } catch (error) {
      addToast(error.response?.data?.error || "Failed to reset passwords", "error");
    } finally {
      setIsResetting(false);
    }
  };

  if (loading) return <Loader />;

  return (
    <div className="space-y-6 animate-fade-in">
      <h1 className="text-3xl font-bold text-white mb-6">Manage Teams</h1>

      {/* MASTER OVERRIDE: ONLY VISIBLE TO SUPER ADMIN */}
      {isSuperAdmin && (
        <Card className="border-red-900/50 bg-red-950/10 mb-8">
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-2 text-red-500 font-bold">
              <Key size={20} />
              <h2>Emergency Password Override (Super Admin Only)</h2>
            </div>
            <Button size="sm" variant="secondary" onClick={handleAddRow} className="text-xs flex items-center gap-1">
              <Plus size={14} /> Add Row
            </Button>
          </div>
          
          <form onSubmit={handlePasswordReset} className="space-y-3">
            {overrides.map((row, index) => {
              const foundTeam = teams.find(t => t.team_id === Number(row.team_id));
              const isTargetValid = !!foundTeam;

              return (
                <div key={row.id} className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end bg-black/40 p-3 rounded border border-zinc-800">
                  <div className="md:col-span-3">
                    <label className="text-zinc-500 text-xs font-bold mb-1 block">TARGET TEAM ID</label>
                    <div className="relative">
                      <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                      <input 
                        type="number" 
                        placeholder="e.g. 101"
                        className="w-full bg-black border border-zinc-700 rounded p-2 pl-8 text-white text-sm focus:border-red-500 focus:outline-none"
                        value={row.team_id}
                        onChange={(e) => handleOverrideChange(row.id, 'team_id', e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  <div className="md:col-span-4">
                    <label className="text-zinc-500 text-xs font-bold mb-1 block">VERIFIED TARGET</label>
                    <div className={`p-2 rounded border text-sm font-bold truncate h-[38px] flex items-center ${isTargetValid ? 'bg-green-900/20 border-green-600 text-green-500' : 'bg-zinc-900 border-zinc-800 text-zinc-600'}`}>
                      {isTargetValid ? foundTeam.team_name : 'No Team Found'}
                    </div>
                  </div>

                  <div className="md:col-span-4">
                    <label className="text-zinc-500 text-xs font-bold mb-1 block">NEW PASSWORD</label>
                    <input 
                      type="text" 
                      placeholder="Enter new password"
                      className="w-full bg-black border border-zinc-700 rounded p-2 text-white text-sm focus:border-red-500 focus:outline-none disabled:opacity-50 h-[38px]"
                      value={row.new_password}
                      onChange={(e) => handleOverrideChange(row.id, 'new_password', e.target.value)}
                      disabled={!isTargetValid}
                      required
                    />
                  </div>

                  <div className="md:col-span-1 flex justify-end">
                    {overrides.length > 1 && (
                      <button 
                        type="button" 
                        onClick={() => handleRemoveRow(row.id)}
                        className="p-2 bg-red-900/30 text-red-500 hover:bg-red-600 hover:text-white rounded transition-colors h-[38px] w-full flex justify-center items-center"
                        title="Remove Row"
                      >
                        <X size={18} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}

            <div className="flex justify-end pt-3">
              <Button 
                type="submit" 
                variant="danger" 
                className="font-bold tracking-wider px-8"
                disabled={isResetting}
              >
                {isResetting ? 'EXECUTING OVERRIDES...' : 'FORCE CHANGE PASSWORDS'}
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* ORIGINAL TABLE UI */}
      <div className="bg-zinc-950 border border-zinc-800 rounded-lg overflow-hidden">
        <table className="w-full text-left whitespace-nowrap">
          <thead className="bg-zinc-900 text-zinc-400">
            <tr>
              <th className="p-4">ID</th>
              <th className="p-4">Team Name</th>
              <th className="p-4">Total Points</th>
              <th className="p-4">Status</th>
              <th className="p-4">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800">
            {teams.length === 0 && (
              <tr><td colSpan="5" className="p-8 text-center text-zinc-500">No teams found.</td></tr>
            )}
            {teams.map(team => (
              <tr key={team.team_id} className="text-zinc-300 hover:bg-zinc-900/50">
                <td className="p-4 text-zinc-500">#{team.team_id}</td>
                <td className="p-4 font-bold text-white">{team.team_name}</td>
                <td className="p-4">{team.total_points}</td>
                <td className="p-4">
                  {team.is_disqualified ? (
                    <span className="bg-red-900/30 text-red-500 px-2 py-1 rounded text-xs font-bold flex items-center gap-1 w-fit">
                      <AlertCircle size={12} /> DQ
                    </span>
                  ) : (
                    <span className="bg-green-900/30 text-green-500 px-2 py-1 rounded text-xs font-bold flex items-center gap-1 w-fit">
                      <Shield size={12} /> ACTIVE
                    </span>
                  )}
                </td>
                <td className="p-4 flex gap-2">
                  <Link to={`/master/team/${team.team_id}`}>
                    <Button size="sm" variant="secondary" className="text-xs h-8">
                        <Eye size={14} /> View
                    </Button>
                  </Link>
                  {team.is_disqualified ? (
                    <Button size="sm" variant="outline" onClick={() => handleRequalify(team.team_id)} className="text-xs h-8">
                      <RefreshCcw size={14} /> Requalify
                    </Button>
                  ) : (
                    <Button size="sm" variant="danger" onClick={() => handleDisqualify(team.team_id)} className="text-xs h-8">
                      <AlertCircle size={14} /> Disqualify
                    </Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Teams;