import { useEffect, useState } from 'react';
import { Plus, Trash2, Users, Crown, Edit2, X, Upload } from 'lucide-react';
import { api } from '../lib/api';
import { PageHeader, LoadingSpinner, inputClass, btnPrimary, Modal } from '../components/ui';
import { CheckCircle, XCircle } from 'lucide-react';

interface TeamMember {
  id: string;
  name: string;
  nameOm?: string;
  role: string;
  roleOm?: string;
  image?: string;
  position: number;
  type: 'member' | 'leader';
}

export default function TeamManagementPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [leaders, setLeaders] = useState<TeamMember[]>([]);
  const [activeTab, setActiveTab] = useState<'members' | 'leaders'>('members');
  
  // Add form state
  const [newName, setNewName] = useState('');
  const [newRole, setNewRole] = useState('');
  const [newNameOm, setNewNameOm] = useState('');
  const [newRoleOm, setNewRoleOm] = useState('');
  const [_newImage, setNewImage] = useState<File | null>(null); // newImage assignment may not be used everywhere
  const [newImagePreview, setNewImagePreview] = useState('');
  
  // Edit form state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editRole, setEditRole] = useState('');
  const [editNameOm, setEditNameOm] = useState('');
  const [editRoleOm, setEditRoleOm] = useState('');
  const [_editImage, setEditImage] = useState<File | null>(null); // editImage assignment may not be used everywhere
  const [editImagePreview, setEditImagePreview] = useState('');
  
  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [modalType, setModalType] = useState<'success' | 'error'>('success');
  const [modalMessage, setModalMessage] = useState('');

  useEffect(() => {
    loadTeam();
  }, []);

  const loadTeam = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/team');
      const allMembers = data.data || [];
      setMembers(allMembers.filter((m: TeamMember) => m.type === 'member').sort((a: TeamMember, b: TeamMember) => a.position - b.position));
      setLeaders(allMembers.filter((m: TeamMember) => m.type === 'leader').sort((a: TeamMember, b: TeamMember) => a.position - b.position));
    } catch {
      console.error('Failed to load team');
    } finally {
      setLoading(false);
    }
  };

  const handleImageSelect = (file: File | null, isEdit: boolean = false) => {
    if (!file) return;
    
    const reader = new FileReader();
    reader.onloadend = () => {
      const preview = reader.result as string;
      if (isEdit) {
        setEditImage(file);
        setEditImagePreview(preview);
      } else {
        setNewImage(file);
        setNewImagePreview(preview);
      }
    };
    reader.readAsDataURL(file);
  };

  const addTeamMember = async () => {
    if (!newName.trim() || !newRole.trim()) {
      setModalType('error');
      setModalMessage('Please fill in all required fields');
      setModalOpen(true);
      return;
    }

    setSaving(true);
    try {
      const items = activeTab === 'members' ? members : leaders;
      const newMember: TeamMember = {
        id: `${Date.now()}`,
        name: newName,
        nameOm: newNameOm,
        role: newRole,
        roleOm: newRoleOm,
        image: newImagePreview,
        position: items.length,
        type: activeTab === 'members' ? 'member' : 'leader',
      };

      const updatedMembers = activeTab === 'members' 
        ? [...members, newMember]
        : members;
      const updatedLeaders = activeTab === 'leaders'
        ? [...leaders, newMember]
        : leaders;

      setMembers(updatedMembers);
      setLeaders(updatedLeaders);

      await api.post('/team', { members: [...updatedMembers, ...updatedLeaders] });

      setNewName('');
      setNewRole('');
      setNewNameOm('');
      setNewRoleOm('');
      setNewImage(null);
      setNewImagePreview('');
      setModalType('success');
      setModalMessage('Team member added successfully!');
      setModalOpen(true);
    } catch {
      setModalType('error');
      setModalMessage('Failed to add team member');
      setModalOpen(true);
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (item: TeamMember) => {
    setEditingId(item.id);
    setEditName(item.name);
    setEditRole(item.role);
    setEditNameOm(item.nameOm || '');
    setEditRoleOm(item.roleOm || '');
    setEditImagePreview(item.image || '');
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditName('');
    setEditRole('');
    setEditNameOm('');
    setEditRoleOm('');
    setEditImage(null);
    setEditImagePreview('');
  };

  const saveEdit = async () => {
    if (!editName.trim() || !editRole.trim()) {
      setModalType('error');
      setModalMessage('Please fill in all required fields');
      setModalOpen(true);
      return;
    }

    setSaving(true);
    try {
      const updatedMembers = members.map(m => 
        m.id === editingId 
          ? {
              ...m,
              name: editName,
              nameOm: editNameOm,
              role: editRole,
              roleOm: editRoleOm,
              image: editImagePreview,
            }
          : m
      );
      const updatedLeaders = leaders.map(l =>
        l.id === editingId
          ? {
              ...l,
              name: editName,
              nameOm: editNameOm,
              role: editRole,
              roleOm: editRoleOm,
              image: editImagePreview,
            }
          : l
      );

      setMembers(updatedMembers);
      setLeaders(updatedLeaders);

      await api.post('/team', { members: [...updatedMembers, ...updatedLeaders] });

      setModalType('success');
      setModalMessage('Team member updated successfully!');
      setModalOpen(true);
      cancelEdit();
    } catch {
      setModalType('error');
      setModalMessage('Failed to update team member');
      setModalOpen(true);
    } finally {
      setSaving(false);
    }
  };

  const removeMember = async (id: string) => {
    const newMembers = members.filter(m => m.id !== id);
    const newLeaders = leaders.filter(l => l.id !== id);

    setMembers(newMembers);
    setLeaders(newLeaders);

    try {
      await api.post('/team', { members: [...newMembers, ...newLeaders] });
      setModalType('success');
      setModalMessage('Team member removed successfully!');
      setModalOpen(true);
    } catch {
      loadTeam();
      setModalType('error');
      setModalMessage('Failed to remove team member');
      setModalOpen(true);
    }
  };

  const saveAll = async () => {
    setSaving(true);
    try {
      const allMembers = [...members, ...leaders];
      await api.post('/team', { members: allMembers });
      setModalType('success');
      setModalMessage('Team information saved successfully!');
      setModalOpen(true);
    } catch {
      setModalType('error');
      setModalMessage('Failed to save team information');
      setModalOpen(true);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <LoadingSpinner />;

  const currentItems = activeTab === 'members' ? members : leaders;

  return (
    <>
      <div className="space-y-6">
        <PageHeader 
          title="Team & Leadership Management" 
          subtitle="Manage team members and leaders for public display"
          action={<button className={btnPrimary} onClick={saveAll} disabled={saving}>{saving ? 'Saving...' : 'Save All'}</button>} 
        />

        {/* Tab Navigation */}
        <div className="bg-white rounded-xl border p-4">
          <div className="flex gap-4 mb-6">
            <button
              onClick={() => setActiveTab('members')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
                activeTab === 'members'
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <Users size={18} />
              Team Members ({members.length})
            </button>
            <button
              onClick={() => setActiveTab('leaders')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
                activeTab === 'leaders'
                  ? 'bg-orange-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <Crown size={18} />
              Leaders ({leaders.length})
            </button>
          </div>

          {/* Add New Member Form */}
          <div className="bg-gray-50 rounded-lg p-6 mb-6 border-2 border-dashed border-gray-300">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Add New {activeTab === 'members' ? 'Member' : 'Leader'}</h3>
            
            {/* Image Upload */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Photo</label>
              <div className="flex gap-4">
                <label className="flex-1 flex items-center justify-center px-4 py-6 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-gray-400 transition-all">
                  <div className="text-center">
                    <Upload size={24} className="mx-auto mb-2 text-gray-400" />
                    <span className="text-sm text-gray-600">Click to upload photo</span>
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleImageSelect(e.target.files?.[0] || null)}
                    className="hidden"
                  />
                </label>
                {newImagePreview && (
                  <div className="relative">
                    <img src={newImagePreview} alt="Preview" className="h-24 w-24 object-cover rounded-lg" />
                    <button
                      onClick={() => {
                        setNewImage(null);
                        setNewImagePreview('');
                      }}
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1"
                    >
                      <X size={16} />
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Name (English) *
                </label>
                <input
                  type="text"
                  className={inputClass}
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Enter name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Role (English) *
                </label>
                <input
                  type="text"
                  className={inputClass}
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value)}
                  placeholder="e.g., Chairperson, Treasurer"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Name (Oromiffa)
                </label>
                <input
                  type="text"
                  className={inputClass}
                  value={newNameOm}
                  onChange={(e) => setNewNameOm(e.target.value)}
                  placeholder="Enter Oromiffa name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Role (Oromiffa)
                </label>
                <input
                  type="text"
                  className={inputClass}
                  value={newRoleOm}
                  onChange={(e) => setNewRoleOm(e.target.value)}
                  placeholder="Enter Oromiffa role"
                />
              </div>
            </div>
            <button
              onClick={addTeamMember}
              disabled={saving}
              className={btnPrimary}
            >
              <Plus size={16} className="inline mr-2" />
              Add {activeTab === 'members' ? 'Member' : 'Leader'}
            </button>
          </div>

          {/* Members/Leaders List */}
          <div className="space-y-3">
            {currentItems.length > 0 ? (
              currentItems.map((item) => (
                <div key={item.id}>
                  {editingId === item.id ? (
                    // Edit Mode
                    <div className="border rounded-lg p-4 bg-blue-50 space-y-4">
                      <h4 className="font-semibold text-gray-800">Edit {activeTab === 'members' ? 'Member' : 'Leader'}</h4>
                      
                      {/* Edit Image */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Photo</label>
                        <div className="flex gap-4">
                          <label className="flex-1 flex items-center justify-center px-4 py-4 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-gray-400 transition-all">
                            <div className="text-center">
                              <Upload size={20} className="mx-auto mb-1 text-gray-400" />
                              <span className="text-xs text-gray-600">Change photo</span>
                            </div>
                            <input
                              type="file"
                              accept="image/*"
                              onChange={(e) => handleImageSelect(e.target.files?.[0] || null, true)}
                              className="hidden"
                            />
                          </label>
                          {editImagePreview && (
                            <div className="relative">
                              <img src={editImagePreview} alt="Preview" className="h-20 w-20 object-cover rounded-lg" />
                              <button
                                onClick={() => {
                                  setEditImage(null);
                                  setEditImagePreview('');
                                }}
                                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1"
                              >
                                <X size={14} />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">Name (English)</label>
                          <input
                            type="text"
                            className={inputClass}
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">Role (English)</label>
                          <input
                            type="text"
                            className={inputClass}
                            value={editRole}
                            onChange={(e) => setEditRole(e.target.value)}
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">Name (Oromiffa)</label>
                          <input
                            type="text"
                            className={inputClass}
                            value={editNameOm}
                            onChange={(e) => setEditNameOm(e.target.value)}
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">Role (Oromiffa)</label>
                          <input
                            type="text"
                            className={inputClass}
                            value={editRoleOm}
                            onChange={(e) => setEditRoleOm(e.target.value)}
                          />
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={saveEdit}
                          disabled={saving}
                          className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all disabled:opacity-50"
                        >
                          Save Changes
                        </button>
                        <button
                          onClick={cancelEdit}
                          className="px-4 py-2 bg-gray-300 text-gray-800 rounded-lg hover:bg-gray-400 transition-all"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    // View Mode
                    <div className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-all gap-4">
                      {item.image && (
                        <img src={item.image} alt={item.name} className="h-16 w-16 object-cover rounded-lg" />
                      )}
                      <div className="flex-1">
                        <h4 className="font-semibold text-gray-800">{item.name}</h4>
                        {item.nameOm && <p className="text-sm text-gray-600">{item.nameOm}</p>}
                        <p className="text-sm text-gray-600">{item.role}</p>
                        {item.roleOm && <p className="text-sm text-gray-500">{item.roleOm}</p>}
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => startEdit(item)}
                          className="px-3 py-2 rounded-lg text-blue-600 hover:bg-blue-50 transition-all border border-blue-200"
                        >
                          <Edit2 size={18} />
                        </button>
                        <button
                          onClick={() => removeMember(item.id)}
                          className="px-3 py-2 rounded-lg text-red-600 hover:bg-red-50 transition-all border border-red-200"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Users size={40} className="mx-auto mb-3 opacity-50" />
                <p>No {activeTab === 'members' ? 'members' : 'leaders'} added yet</p>
              </div>
            )}
          </div>
        </div>

        {/* Info */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
          <h3 className="text-sm font-semibold text-blue-900 mb-3">ℹ️ Information</h3>
          <ul className="text-sm text-blue-800 space-y-2">
            <li><strong>Upload Photo:</strong> Click on the upload area to add a profile photo (JPG, PNG)</li>
            <li><strong>Edit:</strong> Click the edit button (pencil icon) to modify member details and photo</li>
            <li><strong>Delete:</strong> Click the trash icon to remove a member</li>
            <li><strong>Bilingual:</strong> Add names and roles in both English and Oromiffa</li>
            <li><strong>Save All:</strong> Click "Save All" to persist all changes to the database</li>
          </ul>
        </div>
      </div>

      {/* Success/Error Modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={modalType === 'success' ? 'Success' : 'Error'}>
        <div className="text-center py-4">
          {modalType === 'success' ? (
            <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
          ) : (
            <XCircle className="w-16 h-16 text-red-600 mx-auto mb-4" />
          )}
          <p className="text-slate-700 text-sm leading-relaxed">{modalMessage}</p>
          <button
            onClick={() => setModalOpen(false)}
            className={`mt-6 ${btnPrimary}`}
          >
            OK
          </button>
        </div>
      </Modal>
    </>
  );
}
