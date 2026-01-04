import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { documentsAPI, categoriesAPI, favoritesAPI } from '../lib/api';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { Skeleton } from '../components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '../components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../components/ui/dropdown-menu';
import { Checkbox } from '../components/ui/checkbox';
import { toast } from 'sonner';
import {
  FileText,
  Plus,
  Search,
  Filter,
  MoreVertical,
  Pencil,
  Trash2,
  Eye,
  Calendar,
  FolderOpen,
  Upload,
  Download,
  Star,
  StarOff,
  FileImage,
  FileSpreadsheet,
  File,
  X,
} from 'lucide-react';

const Documents = () => {
  const { user, isAdmin } = useAuth();
  const isDirection = user?.role === 'direction';
  const canManageAll = isAdmin || isDirection;
  
  const [documents, setDocuments] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [selectedDocs, setSelectedDocs] = useState([]);
  const [exporting, setExporting] = useState(false);
  const fileInputRef = useRef(null);
  const editFileInputRef = useRef(null);
  
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    category_id: '',
    visibility: ['admin', 'direction', 'personnel_soignant'],
  });
  const [submitting, setSubmitting] = useState(false);

  const roleOptions = [
    { value: 'admin', label: 'Administrateur' },
    { value: 'direction', label: 'Direction' },
    { value: 'personnel_soignant', label: 'Personnel Soignant' },
  ];

  const getFileIcon = (fileType) => {
    if (!fileType) return FileText;
    if (['.png', '.jpg', '.jpeg', '.gif'].includes(fileType)) return FileImage;
    if (['.xlsx', '.xls'].includes(fileType)) return FileSpreadsheet;
    if (['.pdf'].includes(fileType)) return FileText;
    return File;
  };

  const fetchData = async () => {
    try {
      const params = {};
      if (filterCategory !== 'all') params.category_id = filterCategory;
      if (searchTerm) params.search = searchTerm;
      
      const [docsRes, catsRes] = await Promise.all([
        documentsAPI.getAll(params),
        categoriesAPI.getAll(),
      ]);
      setDocuments(docsRes.data);
      setCategories(catsRes.data);
    } catch (error) {
      toast.error('Erreur lors du chargement des documents');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const debounce = setTimeout(() => {
      fetchData();
    }, 300);
    return () => clearTimeout(debounce);
  }, [filterCategory, searchTerm]);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!formData.title || !formData.category_id) {
      toast.error('Veuillez remplir le titre et la catégorie');
      return;
    }

    setSubmitting(true);
    try {
      const data = new FormData();
      data.append('title', formData.title);
      data.append('content', formData.content);
      data.append('category_id', formData.category_id);
      data.append('visibility', formData.visibility.join(','));
      if (selectedFile) {
        data.append('file', selectedFile);
      }
      
      await documentsAPI.create(data);
      toast.success('Document créé avec succès');
      setIsCreateOpen(false);
      resetForm();
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erreur lors de la création');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const data = new FormData();
      if (formData.title) data.append('title', formData.title);
      if (formData.content) data.append('content', formData.content);
      if (formData.category_id) data.append('category_id', formData.category_id);
      if (formData.visibility) data.append('visibility', formData.visibility.join(','));
      if (selectedFile) {
        data.append('file', selectedFile);
      }
      
      await documentsAPI.update(selectedDoc.id, data);
      toast.success('Document mis à jour');
      setIsEditOpen(false);
      resetForm();
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erreur lors de la mise à jour');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (docId) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer ce document ?')) return;

    try {
      await documentsAPI.delete(docId);
      toast.success('Document supprimé');
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erreur lors de la suppression');
    }
  };

  const handleToggleFavorite = async (doc) => {
    try {
      if (doc.is_favorite) {
        await favoritesAPI.remove(doc.id);
        toast.success('Retiré des favoris');
      } else {
        await favoritesAPI.add(doc.id);
        toast.success('Ajouté aux favoris');
      }
      fetchData();
    } catch (error) {
      toast.error('Erreur lors de la modification des favoris');
    }
  };

  const handleExportPDF = async () => {
    if (selectedDocs.length === 0) {
      toast.error('Sélectionnez au moins un document');
      return;
    }

    setExporting(true);
    try {
      const response = await documentsAPI.exportPDF(selectedDocs);
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'documents_export.pdf';
      a.click();
      window.URL.revokeObjectURL(url);
      toast.success('Export PDF téléchargé');
      setSelectedDocs([]);
    } catch (error) {
      toast.error('Erreur lors de l\'export PDF');
    } finally {
      setExporting(false);
    }
  };

  const toggleDocSelection = (docId) => {
    setSelectedDocs(prev => 
      prev.includes(docId) 
        ? prev.filter(id => id !== docId)
        : [...prev, docId]
    );
  };

  const resetForm = () => {
    setFormData({
      title: '',
      content: '',
      category_id: '',
      visibility: ['admin', 'direction', 'personnel_soignant'],
    });
    setSelectedDoc(null);
    setSelectedFile(null);
  };

  const openEdit = (doc) => {
    setSelectedDoc(doc);
    setFormData({
      title: doc.title,
      content: doc.content,
      category_id: doc.category_id,
      visibility: doc.visibility,
    });
    setSelectedFile(null);
    setIsEditOpen(true);
  };

  const openView = (doc) => {
    setSelectedDoc(doc);
    setIsViewOpen(true);
  };

  const toggleVisibility = (role) => {
    setFormData((prev) => ({
      ...prev,
      visibility: prev.visibility.includes(role)
        ? prev.visibility.filter((r) => r !== role)
        : [...prev.visibility, role],
    }));
  };

  const canEdit = (doc) => canManageAll || doc.created_by === user?.id;

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-4">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="documents-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Documents</h1>
          <p className="text-muted-foreground">Gérez vos documents administratifs et médicaux</p>
        </div>
        <div className="flex gap-2">
          {selectedDocs.length > 0 && (
            <Button
              variant="outline"
              onClick={handleExportPDF}
              disabled={exporting}
              data-testid="export-pdf-btn"
            >
              <Download className="w-4 h-4 mr-2" />
              {exporting ? 'Export...' : `Exporter (${selectedDocs.length})`}
            </Button>
          )}
          <Dialog open={isCreateOpen} onOpenChange={(open) => { setIsCreateOpen(open); if (!open) resetForm(); }}>
            <DialogTrigger asChild>
              <Button data-testid="create-document-btn">
                <Plus className="w-4 h-4 mr-2" />
                Nouveau document
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Créer un document</DialogTitle>
                <DialogDescription>
                  Ajoutez un nouveau document avec fichier attaché (PDF, Word, Excel, Image)
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreate} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Titre *</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="Titre du document"
                    data-testid="doc-title-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="category">Catégorie *</Label>
                  <Select
                    value={formData.category_id}
                    onValueChange={(value) => setFormData({ ...formData, category_id: value })}
                  >
                    <SelectTrigger data-testid="doc-category-select">
                      <SelectValue placeholder="Sélectionner une catégorie" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id}>
                          {cat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                {/* File Upload */}
                <div className="space-y-2">
                  <Label>Fichier attaché</Label>
                  <div className="border-2 border-dashed rounded-lg p-4 text-center cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      className="hidden"
                      accept=".pdf,.docx,.doc,.xlsx,.xls,.png,.jpg,.jpeg,.gif,.txt"
                      onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                    />
                    {selectedFile ? (
                      <div className="flex items-center justify-center gap-2">
                        <File className="w-5 h-5 text-primary" />
                        <span className="text-sm">{selectedFile.name}</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={(e) => { e.stopPropagation(); setSelectedFile(null); }}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-2">
                        <Upload className="w-8 h-8 text-muted-foreground" />
                        <p className="text-sm text-muted-foreground">
                          Cliquez pour uploader (PDF, Word, Excel, Image)
                        </p>
                        <p className="text-xs text-muted-foreground">Max 10 MB</p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="content">Contenu / Description</Label>
                  <Textarea
                    id="content"
                    value={formData.content}
                    onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                    placeholder="Contenu ou description du document..."
                    className="min-h-[150px]"
                    data-testid="doc-content-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Visibilité</Label>
                  <div className="flex flex-wrap gap-4">
                    {roleOptions.map((role) => (
                      <div key={role.value} className="flex items-center space-x-2">
                        <Checkbox
                          id={role.value}
                          checked={formData.visibility.includes(role.value)}
                          onCheckedChange={() => toggleVisibility(role.value)}
                        />
                        <Label htmlFor={role.value} className="text-sm font-normal">
                          {role.label}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>
                    Annuler
                  </Button>
                  <Button type="submit" disabled={submitting} data-testid="doc-submit-btn">
                    {submitting ? 'Création...' : 'Créer'}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher dans les documents..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
            data-testid="search-documents"
          />
        </div>
        <Select value={filterCategory} onValueChange={setFilterCategory}>
          <SelectTrigger className="w-full sm:w-[200px]" data-testid="filter-category">
            <Filter className="w-4 h-4 mr-2" />
            <SelectValue placeholder="Filtrer par catégorie" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes les catégories</SelectItem>
            {categories.map((cat) => (
              <SelectItem key={cat.id} value={cat.id}>
                {cat.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Documents List */}
      {documents.length > 0 ? (
        <div className="grid gap-4">
          {documents.map((doc) => {
            const FileIcon = getFileIcon(doc.file_type);
            const isSelected = selectedDocs.includes(doc.id);
            
            return (
              <Card 
                key={doc.id} 
                className={`card-hover transition-all ${isSelected ? 'ring-2 ring-primary' : ''}`}
                data-testid={`doc-${doc.id}`}
              >
                <CardContent className="p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-4 flex-1">
                      <div className="flex items-center gap-3">
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => toggleDocSelection(doc.id)}
                          data-testid={`select-doc-${doc.id}`}
                        />
                        <div className={`w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0 ${
                          doc.file_type ? 'bg-chart-2/10' : 'bg-primary/10'
                        }`}>
                          <FileIcon className={`w-6 h-6 ${doc.file_type ? 'text-chart-2' : 'text-primary'}`} />
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-lg">{doc.title}</h3>
                          {doc.is_favorite && (
                            <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                          {doc.content?.substring(0, 150)}...
                        </p>
                        <div className="flex flex-wrap items-center gap-3 mt-3">
                          <Badge variant="secondary" className="flex items-center gap-1">
                            <FolderOpen className="w-3 h-3" />
                            {doc.category_name}
                          </Badge>
                          {doc.file_type && (
                            <Badge variant="outline" className="uppercase text-xs">
                              {doc.file_type.replace('.', '')}
                            </Badge>
                          )}
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {new Date(doc.created_at).toLocaleDateString('fr-FR')}
                          </span>
                          {doc.created_by_name && (
                            <span className="text-xs text-muted-foreground">
                              par {doc.created_by_name}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" data-testid={`doc-menu-${doc.id}`}>
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openView(doc)}>
                          <Eye className="w-4 h-4 mr-2" />
                          Voir
                        </DropdownMenuItem>
                        {doc.file_url && (
                          <DropdownMenuItem onClick={() => window.open(documentsAPI.getFile(doc.id), '_blank')}>
                            <Download className="w-4 h-4 mr-2" />
                            Télécharger fichier
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem onClick={() => handleToggleFavorite(doc)}>
                          {doc.is_favorite ? (
                            <>
                              <StarOff className="w-4 h-4 mr-2" />
                              Retirer des favoris
                            </>
                          ) : (
                            <>
                              <Star className="w-4 h-4 mr-2" />
                              Ajouter aux favoris
                            </>
                          )}
                        </DropdownMenuItem>
                        {canEdit(doc) && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => openEdit(doc)}>
                              <Pencil className="w-4 h-4 mr-2" />
                              Modifier
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleDelete(doc.id)}
                              className="text-destructive"
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Supprimer
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <FileText className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <p className="text-muted-foreground">Aucun document trouvé</p>
            <p className="text-sm text-muted-foreground mt-1">
              {searchTerm ? 'Essayez avec d\'autres mots-clés' : 'Créez votre premier document'}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={(open) => { setIsEditOpen(open); if (!open) resetForm(); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Modifier le document</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUpdate} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-title">Titre</Label>
              <Input
                id="edit-title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-category">Catégorie</Label>
              <Select
                value={formData.category_id}
                onValueChange={(value) => setFormData({ ...formData, category_id: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {/* File Upload for Edit */}
            <div className="space-y-2">
              <Label>Remplacer le fichier</Label>
              {selectedDoc?.file_name && !selectedFile && (
                <p className="text-sm text-muted-foreground mb-2">
                  Fichier actuel: {selectedDoc.file_name}
                </p>
              )}
              <div className="border-2 border-dashed rounded-lg p-4 text-center cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => editFileInputRef.current?.click()}
              >
                <input
                  ref={editFileInputRef}
                  type="file"
                  className="hidden"
                  accept=".pdf,.docx,.doc,.xlsx,.xls,.png,.jpg,.jpeg,.gif,.txt"
                  onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                />
                {selectedFile ? (
                  <div className="flex items-center justify-center gap-2">
                    <File className="w-5 h-5 text-primary" />
                    <span className="text-sm">{selectedFile.name}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={(e) => { e.stopPropagation(); setSelectedFile(null); }}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2">
                    <Upload className="w-6 h-6 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">Cliquez pour changer le fichier</p>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-content">Contenu</Label>
              <Textarea
                id="edit-content"
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                className="min-h-[150px]"
              />
            </div>
            <div className="space-y-2">
              <Label>Visibilité</Label>
              <div className="flex flex-wrap gap-4">
                {roleOptions.map((role) => (
                  <div key={role.value} className="flex items-center space-x-2">
                    <Checkbox
                      id={`edit-${role.value}`}
                      checked={formData.visibility.includes(role.value)}
                      onCheckedChange={() => toggleVisibility(role.value)}
                    />
                    <Label htmlFor={`edit-${role.value}`} className="text-sm font-normal">
                      {role.label}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsEditOpen(false)}>
                Annuler
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? 'Enregistrement...' : 'Enregistrer'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* View Dialog */}
      <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedDoc?.title}
              {selectedDoc?.is_favorite && (
                <Star className="w-5 h-5 text-yellow-500 fill-yellow-500" />
              )}
            </DialogTitle>
            <DialogDescription className="flex items-center gap-2 flex-wrap">
              <Badge variant="secondary">{selectedDoc?.category_name}</Badge>
              {selectedDoc?.file_type && (
                <Badge variant="outline" className="uppercase">{selectedDoc.file_type.replace('.', '')}</Badge>
              )}
              <span>{selectedDoc?.created_at && new Date(selectedDoc.created_at).toLocaleDateString('fr-FR')}</span>
              {selectedDoc?.created_by_name && <span>par {selectedDoc.created_by_name}</span>}
            </DialogDescription>
          </DialogHeader>
          
          {selectedDoc?.file_url && (
            <div className="mb-4">
              <Button variant="outline" onClick={() => window.open(documentsAPI.getFile(selectedDoc.id), '_blank')}>
                <Download className="w-4 h-4 mr-2" />
                Télécharger le fichier ({selectedDoc.file_name})
              </Button>
            </div>
          )}
          
          <div className="prose prose-sm max-w-none dark:prose-invert whitespace-pre-wrap bg-muted/30 p-4 rounded-lg">
            {selectedDoc?.content}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Documents;
