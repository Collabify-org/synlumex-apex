'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  Loader2,
  Download,
  Trash2,
  AlertTriangle,
  Check,
  HardDriveDownload,
} from 'lucide-react';
import { exportWorkspaceData, deleteWorkspace } from './danger-actions';

export function DangerForm({
  workspaceName,
  canDelete,
  isOwner,
}: {
  workspaceName: string;
  canDelete: boolean;
  isOwner: boolean;
}) {
  const router = useRouter();
  const [exporting, setExporting] = useState(false);
  const [confirmName, setConfirmName] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDelete, setShowDelete] = useState(false);

  async function handleExport() {
    setExporting(true);
    setError(null);
    const res = await exportWorkspaceData();
    setExporting(false);
    if (!res.ok) {
      setError(res.error ?? 'Export failed');
      return;
    }

    // Trigger file download in browser
    const blob = new Blob([JSON.stringify(res.data, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `synlumex-export-${workspaceName.replace(/\s+/g, '-').toLowerCase()}-${new Date()
      .toISOString()
      .slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  async function handleDelete() {
    if (confirmName.trim() !== workspaceName) {
      setError('Type the workspace name exactly to confirm');
      return;
    }
    if (!confirm('This is your last chance. Delete the workspace permanently?')) return;

    setDeleting(true);
    setError(null);
    const res = await deleteWorkspace(confirmName);
    setDeleting(false);
    if (!res.ok) {
      setError(res.error ?? 'Deletion failed');
      return;
    }

    // Redirect to login or home
    window.location.href = '/';
  }

  return (
    <div className="space-y-4">
      {!isOwner && (
        <Card className="p-3 bg-amber-500/5 border-amber-500/30">
          <div className="flex items-center gap-2 text-xs text-amber-500">
            <AlertTriangle className="h-3.5 w-3.5" />
            Only the workspace owner can perform these actions.
          </div>
        </Card>
      )}

      {/* Export data */}
      <Card className="p-5 bg-card/50">
        <div className="flex items-start gap-3 mb-4">
          <div className="h-9 w-9 rounded-md bg-brand/10 text-brand flex items-center justify-center shrink-0">
            <HardDriveDownload className="h-4 w-4" />
          </div>
          <div>
            <h3 className="font-semibold">Export workspace data</h3>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
              Download a complete JSON export of your workspace — projects,
              exceptions, reminders, billing, collections, and members. Useful for
              compliance, backups, or migrating to another system.
            </p>
          </div>
        </div>

        <Button
          onClick={handleExport}
          disabled={!isOwner || exporting}
          variant="outline"
          className="gap-2"
        >
          {exporting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Download className="h-4 w-4" />
          )}
          Download JSON export
        </Button>
      </Card>

      {/* Delete workspace */}
      <Card className="p-5 border-destructive/40 bg-destructive/5">
        <div className="flex items-start gap-3 mb-4">
          <div className="h-9 w-9 rounded-md bg-destructive/10 text-destructive flex items-center justify-center shrink-0">
            <Trash2 className="h-4 w-4" />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold text-destructive">Delete workspace</h3>
              <Badge variant="red" className="text-[9px]">
                IRREVERSIBLE
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Permanently delete this workspace and all its data — projects,
              exceptions, reminders, billing records, and audit history. This
              cannot be undone.
            </p>
          </div>
        </div>

        {!showDelete ? (
          <Button
            onClick={() => setShowDelete(true)}
            disabled={!isOwner}
            variant="outline"
            className="gap-2 text-destructive border-destructive/40 hover:bg-destructive/10"
          >
            <Trash2 className="h-4 w-4" />
            Delete this workspace
          </Button>
        ) : (
          <div className="space-y-3 rounded-md border border-destructive/40 bg-destructive/10 p-4">
            <p className="text-xs text-destructive font-medium">
              Type <span className="font-mono bg-destructive/20 px-1 rounded">{workspaceName}</span> below to confirm deletion.
            </p>
            <Input
              value={confirmName}
              onChange={(e) => setConfirmName(e.target.value)}
              placeholder={workspaceName}
              className="font-mono"
            />
            <div className="flex items-center justify-between gap-3">
              <button
                onClick={() => {
                  setShowDelete(false);
                  setConfirmName('');
                  setError(null);
                }}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                Cancel
              </button>
              <Button
                onClick={handleDelete}
                disabled={deleting || confirmName.trim() !== workspaceName}
                variant="destructive"
                size="sm"
                className="gap-2"
              >
                {deleting ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Trash2 className="h-3.5 w-3.5" />
                )}
                Permanently delete workspace
              </Button>
            </div>
          </div>
        )}
      </Card>

      {error && (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive flex items-center gap-2">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
          {error}
        </div>
      )}
    </div>
  );
}
