import React, { useState } from 'react';
import { Card, Input, Button } from '../../components/ui/Components';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';
import { Upload, FileSpreadsheet } from 'lucide-react';
import api from '../../utils/api';

const CreateTeam = () => {
  const { addToast } = useToast();
  const { user } = useAuth();
  
  const isSuperAdmin = user?.email === 'uzumakiaditya433@gmail.com';
  const [activeTab, setActiveTab] = useState('SINGLE'); // 'SINGLE' or 'BULK'
  
  // Single Upload State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState({
    team_name: '',
    leader_name: '',
    leader_email: '',
    leader_password: '',
    members: [{ name: '', email: '' }, { name: '', email: '' }, { name: '', email: '' }, { name: '', email: '' }]
  });

  // Bulk Upload State
  const [csvFile, setCsvFile] = useState(null);
  const [isUploadingCSV, setIsUploadingCSV] = useState(false);

  const handleMemberChange = (index, field, value) => {
    const newMembers = [...form.members];
    newMembers[index][field] = value;
    setForm({ ...form, members: newMembers });
  };

  const handleSingleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    const validMembers = form.members.filter(m => m.name.trim() !== '' && m.email.trim() !== '');

    try {
      const res = await api.post('/admin/create-team', {
        team_name: form.team_name,
        leader_name: form.leader_name,
        leader_email: form.leader_email,
        leader_password: form.leader_password,
        members: validMembers
      });

      addToast(res.data.message || `Team "${form.team_name}" created successfully.`, "success");
      
      setForm({
        team_name: '', leader_name: '', leader_email: '', leader_password: '',
        members: [{ name: '', email: '' }, { name: '', email: '' }, { name: '', email: '' }, { name: '', email: '' }]
      });
    } catch (error) {
      addToast(error.response?.data?.error || "Failed to create team", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBulkSubmit = async (e) => {
    e.preventDefault();
    if (!csvFile) {
      addToast("Please select a CSV file first.", "error");
      return;
    }

    setIsUploadingCSV(true);
    try {
      const formData = new FormData();
      formData.append('file', csvFile);

      const res = await api.post('/admin/bulk-register', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      addToast(res.data.message, "success");
      if (res.data.errors && res.data.errors.length > 0) {
        console.warn("Bulk Upload Errors:", res.data.errors);
        addToast("Some rows failed. Check console for details.", "error");
      }
      setCsvFile(null); // Reset
    } catch (error) {
      addToast(error.response?.data?.error || "Bulk upload failed", "error");
    } finally {
      setIsUploadingCSV(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto animate-fade-in">
      <h1 className="text-3xl font-bold text-white mb-6">Register Teams</h1>
      
      {isSuperAdmin && (
        <div className="flex gap-2 mb-6 border-b border-zinc-800 pb-2">
          <button 
            onClick={() => setActiveTab('SINGLE')}
            className={`px-4 py-2 font-bold rounded ${activeTab === 'SINGLE' ? 'bg-red-600 text-white' : 'text-zinc-500 hover:text-white'}`}
          >
            Single Team Entry
          </button>
          <button 
            onClick={() => setActiveTab('BULK')}
            className={`px-4 py-2 font-bold rounded flex items-center gap-2 ${activeTab === 'BULK' ? 'bg-blue-600 text-white' : 'text-zinc-500 hover:text-white'}`}
          >
            <FileSpreadsheet size={16} /> Bulk Upload (CSV)
          </button>
        </div>
      )}

      <Card>
        {activeTab === 'SINGLE' ? (
          <form onSubmit={handleSingleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input label="Team Name" value={form.team_name} onChange={e => setForm({...form, team_name: e.target.value})} required />
              <div className="hidden md:block"></div> 
              
              <Input label="Leader Name" value={form.leader_name} onChange={e => setForm({...form, leader_name: e.target.value})} required />
              <Input label="Leader Email" type="email" value={form.leader_email} onChange={e => setForm({...form, leader_email: e.target.value})} required />
              <Input label="Leader Password" type="password" value={form.leader_password} onChange={e => setForm({...form, leader_password: e.target.value})} required />
            </div>

            <div className="border-t border-zinc-800 pt-4">
              <h3 className="text-white font-bold mb-4">Team Members (Leader + 2 to 4 Members)</h3>
              <div className="space-y-4">
                {form.members.map((member, index) => (
                  <div key={index} className="grid grid-cols-2 gap-4">
                    <Input 
                      placeholder={`Member ${index + 2} Name ${index < 2 ? '*' : '(Optional)'}`}
                      value={member.name}
                      onChange={e => handleMemberChange(index, 'name', e.target.value)}
                      required={index < 2}
                    />
                    <Input 
                      placeholder={`Member ${index + 2} Email ${index < 2 ? '*' : '(Optional)'}`}
                      type="email"
                      value={member.email}
                      onChange={e => handleMemberChange(index, 'email', e.target.value)}
                      required={index < 2}
                    />
                  </div>
                ))}
              </div>
            </div>

            <Button type="submit" className="w-full bg-red-600 hover:bg-red-700" disabled={isSubmitting}>
              {isSubmitting ? 'Processing...' : 'Create Team'}
            </Button>
          </form>
        ) : (
          <form onSubmit={handleBulkSubmit} className="space-y-6">
            <div className="bg-blue-900/10 border border-blue-900/30 rounded-lg p-6 text-center">
              <Upload className="mx-auto text-blue-500 mb-4" size={40} />
              <h3 className="text-white font-bold mb-2">Upload Registration CSV</h3>
              <p className="text-zinc-400 text-sm mb-6 max-w-md mx-auto">
                Ensure your CSV exactly matches the exported Google Form format. Empty rows and duplicate emails will be automatically skipped. 
                <br/><br/>
                <span className="text-yellow-500 font-bold">Leader passwords will default to their Phone Number.</span>
              </p>
              
              <input 
                type="file" 
                accept=".csv"
                onChange={e => setCsvFile(e.target.files[0])}
                className="block w-full text-sm text-zinc-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-700 cursor-pointer mx-auto max-w-xs"
              />
            </div>
            
            <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700" disabled={isUploadingCSV || !csvFile}>
              {isUploadingCSV ? 'Importing Data...' : 'Execute Bulk Registration'}
            </Button>
          </form>
        )}
      </Card>
    </div>
  );
};

export default CreateTeam;