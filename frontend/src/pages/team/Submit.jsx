import React, { useState, useEffect } from 'react';
import { Card, Button, Loader } from '../../components/ui/Components';
import { useLocation, useNavigate } from 'react-router-dom';
import { Upload, AlertTriangle, Info } from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import api from '../../utils/api';

const Submit = () => {
  const { state } = useLocation();
  const navigate = useNavigate();
  const { addToast } = useToast();
  
  const [tasks, setTasks] = useState([]);
  const [allFetchedTasks, setAllFetchedTasks] = useState([]);
  const [gameState, setGameState] = useState(null);
  const [teamState, setTeamState] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    task_id: state?.taskId || '',
    description: '',
    file: null
  });

  useEffect(() => {
    const fetchInitData = async () => {
      try {
        const [tasksRes, gameRes, teamRes, subsRes] = await Promise.all([
          api.get('/tasks/active'),
          api.get('/game/status'),
          api.get('/team/me'),
          api.get('/submissions/my')
        ]);
        
        const submittedTaskIds = subsRes.data.map(s => s.task_id);
        const availableTasks = tasksRes.data.filter(t => !submittedTaskIds.includes(t.task_id) && t.category !== 'PERSONAL');
        
        setTasks(availableTasks);
        setAllFetchedTasks(tasksRes.data); 
        setGameState(gameRes.data);
        setTeamState(teamRes.data);
      } catch (error) {
        addToast("Error connecting to server", "error");
      } finally {
        setLoading(false);
      }
    };
    fetchInitData();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (teamState?.is_disqualified || !gameState?.is_active || gameState?.is_paused) {
      addToast("Submission blocked by global game state.", "error");
      return;
    }

    if (!formData.task_id) {
      addToast("Please select a directive.", "error");
      return;
    }

    // Validation
    if (formData.task_id !== 'other' && !formData.file) {
      addToast("Proof file is required for official Master directives.", "error");
      return;
    }

    if (formData.task_id === 'other' && (!formData.description || formData.description.length < 10)) {
      addToast("A detailed description including your GDrive link is required.", "error");
      return;
    }

    setIsSubmitting(true);

    try {
      const data = new FormData();
      
      // ✅ FIX: We just send exactly what is selected ('other' or the task ID number). 
      // The backend is already programmed to handle "other" perfectly!
      data.append('task_id', formData.task_id); 
      data.append('description', formData.description);
      
      // Only append file if it's an official task
      if (formData.task_id !== 'other' && formData.file) {
        data.append('file', formData.file);
      }

      await api.post('/submissions/create', data, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      addToast("Data transmitted successfully. Status: PENDING", "success");
      navigate('/team/my-submissions');
    } catch (error) {
      addToast(error.response?.data?.error || "Upload failed", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) return <Loader />;

  if (teamState?.is_disqualified) {
    return (
      <div className="p-8 bg-red-900/20 border border-red-600 text-red-500 rounded text-center">
        <AlertTriangle size={48} className="mx-auto mb-4" />
        <h2 className="text-2xl font-bold">ACCESS DENIED</h2>
        <p>Your team has been disqualified from the Culling Games.</p>
      </div>
    );
  }

  const isPersonal = formData.task_id === 'other';

  return (
    <div className="max-w-2xl mx-auto animate-fade-in">
      <h1 className="text-3xl font-bold text-white mb-6">Submit Evidence</h1>
      
      <Card>
        <form onSubmit={handleSubmit} className="flex flex-col">
          
          {/* Directive Selector */}
          <div className="mb-6">
            <label className="text-zinc-400 text-sm font-medium mb-2 block">Select Directive</label>
            <select 
              className="w-full bg-zinc-900 border border-zinc-800 rounded p-3 text-white focus:border-red-600 focus:outline-none transition-colors"
              value={formData.task_id}
              onChange={e => setFormData({...formData, task_id: e.target.value})}
              required
            >
              <option value="">-- Choose Directive --</option>
              {tasks.map(t => (
                <option key={t.task_id} value={t.task_id}>{t.name} (Pts: {t.points})</option>
              ))}
              <option value="other">Other / Personal Submission</option>
            </select>
          </div>

          {/* Smooth Sliding Upload Box */}
          <div className={`transition-all duration-500 ease-in-out overflow-hidden ${isPersonal ? 'max-h-0 opacity-0 mb-0' : 'max-h-[500px] opacity-100 mb-6'}`}>
            <label className="text-zinc-400 text-sm font-medium mb-2 block">Proof of Execution (File)</label>
            <div className="border-2 border-dashed border-zinc-800 rounded-lg p-8 text-center hover:border-zinc-600 transition-colors cursor-pointer relative">
              <input 
                type="file" 
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                onChange={e => setFormData({...formData, file: e.target.files[0]})}
              />
              <Upload className="mx-auto text-zinc-500 mb-2" size={32} />
              <p className="text-zinc-400 text-sm">
                {formData.file ? formData.file.name : "Click to select a file (PDF, Image, etc.)"}
              </p>
            </div>
          </div>

          {/* Description Box */}
          <div className="mb-6">
            <label className="text-zinc-400 text-sm font-medium mb-2 block">
              {isPersonal ? 'Submission Details & Evidence Link' : 'Description / Notes'}
            </label>
            <textarea 
              className={`w-full bg-zinc-900 border rounded p-3 text-white h-32 focus:outline-none transition-colors ${isPersonal ? 'border-blue-500/50 focus:border-blue-500' : 'border-zinc-800 focus:border-red-600'}`}
              placeholder={isPersonal ? "1. Describe your task/achievement.\n2. Paste your Google Drive Evidence Link here (Make sure access is set to 'Anyone with link')." : "Provide context for your submission..."}
              value={formData.description}
              onChange={e => setFormData({...formData, description: e.target.value})}
            ></textarea>

            {/* Smooth Sliding Professional Note */}
            <div className={`transition-all duration-500 ease-in-out overflow-hidden ${isPersonal ? 'max-h-[200px] opacity-100 mt-3' : 'max-h-0 opacity-0 mt-0'}`}>
              <div className="flex gap-3 bg-blue-900/10 border border-blue-900/30 p-3 rounded-lg text-blue-400 text-sm">
                <Info size={20} className="shrink-0 mt-0.5" />
                <p>
                  <strong className="text-blue-300 block mb-1">PROTOCOL EXCEPTION ACTIVE</strong>
                  To optimize system bandwidth, direct file uploads are disabled for custom achievements. Please upload your evidence (Images, PDFs, Videos) to a secure external vault like <strong>Google Drive</strong>. Ensure visibility is set to <em>"Anyone with the link can view"</em>, and provide the URL in the text box above.
                </p>
              </div>
            </div>
          </div>

          <Button type="submit" className="w-full bg-red-600 hover:bg-red-700 mt-2" disabled={isSubmitting}>
            {isSubmitting ? 'Transmitting Data...' : 'Transmit Data'}
          </Button>
        </form>
      </Card>
    </div>
  );
};

export default Submit;