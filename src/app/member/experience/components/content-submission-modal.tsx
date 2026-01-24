import { useState } from 'react';
import type { Team, SubmissionForm } from '../types';

interface ContentSubmissionModalProps {
  isOpen: boolean;
  team: Team | null;
  onClose: () => void;
  onUploadFile: (teamId: string, file: File) => Promise<{ success: boolean; data?: any; error?: string }>;
  onSubmitContent: (teamId: string, form: SubmissionForm) => Promise<{ success: boolean; error?: string }>;
  uploading: boolean;
  submitting: boolean;
}

const initialForm: SubmissionForm = {
  materialsPath: '',
  materialsSize: 0,
  contentTitle: '',
  contentBody: '',
  contentLinks: []
};

export function ContentSubmissionModal({
  isOpen,
  team,
  onClose,
  onUploadFile,
  onSubmitContent,
  uploading,
  submitting
}: ContentSubmissionModalProps) {
  const [form, setForm] = useState<SubmissionForm>(initialForm);

  const handleFileUpload = async (file: File) => {
    if (!team) return;

    const result = await onUploadFile(team.id, file);
    if (result.success && result.data) {
      setForm(prev => ({
        ...prev,
        materialsPath: result.data.filePath,
        materialsSize: result.data.fileSize
      }));
      alert('파일이 업로드되었습니다.');
    } else {
      alert(result.error);
    }
  };

  const handleSubmit = async () => {
    if (!team) return;

    const result = await onSubmitContent(team.id, form);
    if (result.success) {
      alert('제출물이 성공적으로 저장되었습니다.');
      handleClose();
    } else {
      alert(result.error);
    }
  };

  const handleClose = () => {
    onClose();
    setForm(initialForm);
  };

  const addLink = () => {
    setForm(prev => ({
      ...prev,
      contentLinks: [...prev.contentLinks, '']
    }));
  };

  const updateLink = (index: number, value: string) => {
    setForm(prev => ({
      ...prev,
      contentLinks: prev.contentLinks.map((link, i) => i === index ? value : link)
    }));
  };

  const removeLink = (index: number) => {
    setForm(prev => ({
      ...prev,
      contentLinks: prev.contentLinks.filter((_, i) => i !== index)
    }));
  };

  if (!isOpen || !team) return null;

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-surface border border-border rounded-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-bold text-text mb-4">자료 및 컨텐츠 제출</h2>
        <p className="text-text-subtle mb-6">
          <strong className="text-text">{team.name}</strong> 팀의 체험 결과를 제출합니다.
        </p>

        <div className="space-y-6">
          {/* 자료 업로드 */}
          <div>
            <label className="block text-sm font-medium text-text-muted mb-2">
              체험 자료 (ZIP 파일, 최대 300MB)
            </label>
            <div className="border-2 border-dashed border-border rounded-lg p-4 bg-surface-muted">
              {form.materialsPath ? (
                <div className="text-center">
                  <div className="text-emerald-700 font-medium">파일이 업로드되었습니다</div>
                  <div className="text-sm text-text-subtle mt-1">
                    크기: {(form.materialsSize / 1024 / 1024).toFixed(2)}MB
                  </div>
                </div>
              ) : (
                <div className="text-center">
                  <input
                    type="file"
                    accept=".zip"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleFileUpload(file);
                    }}
                    disabled={uploading}
                    className="hidden"
                    id="file-upload"
                  />
                  <label
                    htmlFor="file-upload"
                    className="cursor-pointer text-accent hover:text-accent/80 transition-colors"
                  >
                    {uploading ? '업로드 중...' : 'ZIP 파일을 선택하세요'}
                  </label>
                  <p className="text-xs text-text-subtle mt-1">
                    최대 300MB까지 업로드 가능합니다
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* 컨텐츠 제목 */}
          <div>
            <label className="block text-sm font-medium text-text-muted mb-2">
              컨텐츠 제목 (선택사항)
            </label>
            <input
              type="text"
              value={form.contentTitle}
              onChange={(e) => setForm(prev => ({ ...prev, contentTitle: e.target.value }))}
              className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-text placeholder:text-text-subtle focus:outline-none focus:border-ring/50 focus:ring-2 focus:ring-ring/20"
              placeholder="컨텐츠 제목을 입력하세요"
              disabled={submitting}
            />
          </div>

          {/* 컨텐츠 본문 */}
          <div>
            <label className="block text-sm font-medium text-text-muted mb-2">
              컨텐츠 본문 (선택사항)
            </label>
            <textarea
              value={form.contentBody}
              onChange={(e) => setForm(prev => ({ ...prev, contentBody: e.target.value }))}
              rows={6}
              className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-text placeholder:text-text-subtle focus:outline-none focus:border-ring/50 focus:ring-2 focus:ring-ring/20 resize-none"
              placeholder="체험 후기를 작성하세요"
              disabled={submitting}
            />
          </div>

          {/* 관련 링크 */}
          <div>
            <label className="block text-sm font-medium text-text-muted mb-2">
              관련 링크 (선택사항)
            </label>
            {form.contentLinks.map((link, index) => (
              <div key={index} className="flex gap-2 mb-2">
                <input
                  type="url"
                  value={link}
                  onChange={(e) => updateLink(index, e.target.value)}
                  className="flex-1 bg-surface border border-border rounded-lg px-3 py-2 text-text placeholder:text-text-subtle focus:outline-none focus:border-ring/50 focus:ring-2 focus:ring-ring/20"
                  placeholder="https://..."
                  disabled={submitting}
                />
                <button
                  onClick={() => removeLink(index)}
                  className="text-red-600 hover:text-red-700 transition-colors"
                  disabled={submitting}
                >
                  삭제
                </button>
              </div>
            ))}
            <button
              onClick={addLink}
              className="text-accent hover:text-accent/80 text-sm transition-colors"
              disabled={submitting}
            >
              + 링크 추가
            </button>
          </div>
        </div>

        <div className="flex justify-end space-x-3 mt-6">
          <button
            onClick={handleClose}
            className="px-4 py-2 text-text-subtle border border-border rounded-lg hover:bg-surface-strong transition-colors"
            disabled={submitting}
          >
            취소
          </button>
          <button
            onClick={handleSubmit}
            disabled={uploading || submitting}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            제출하기
          </button>
        </div>
      </div>
    </div>
  );
}
