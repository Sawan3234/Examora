import { Eye, AlertTriangle } from "lucide-react";
import { useNavigate } from "react-router-dom";

export function ExamSessionsTable({ sessions }) {
  const navigate = useNavigate();

  if (sessions.length === 0) {
    return (
      <div className="bg-white rounded-[18px] border border-[#eaecf0] p-8 text-center">
        <p className="text-[#667085]">No exam sessions found</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-[18px] border border-[#eaecf0] overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-[#f9fafb] border-b border-[#eaecf0]">
            <tr>
              <th className="px-6 py-4 text-left text-sm font-semibold text-[#475467">Student</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-[#475467">Exam</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-[#475467">Status</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-[#475467">Violations</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-[#475467">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#eaecf0]">
            {sessions.map((session) => (
              <tr key={session._id} className="hover:bg-[#f9fafb] transition-colors">
                <td className="px-6 py-4 text-sm">
                  <div>
                    <p className="font-medium text-[#101828]">{session.student?.name || 'N/A'}</p>
                    <p className="text-xs text-[#667085]">{session.student?.email || 'N/A'}</p>
                  </div>
                </td>
                <td className="px-6 py-4 text-sm text-[#667085]">{session.exam?.title || 'N/A'}</td>
                <td className="px-6 py-4 text-sm">
                  <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                    session.status === 'completed' ? 'bg-green-100 text-green-700' :
                    session.status === 'in_progress' ? 'bg-blue-100 text-blue-700' :
                    session.status === 'flagged' ? 'bg-red-100 text-red-700' :
                    'bg-gray-100 text-gray-700'
                  }`}>
                    {session.status?.replace('_', ' ') || 'N/A'}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm">
                  <div className="flex items-center gap-1">
                    <AlertTriangle className="h-4 w-4 text-[#e7000b]" />
                    <span className="font-semibold text-[#e7000b]">{session.violations?.length || 0}</span>
                  </div>
                </td>
                <td className="px-6 py-4 text-sm">
                  <button
                    onClick={() => navigate(`/admin/sessions/${session._id}`)}
                    className="text-[#4f39f6] hover:text-[#9810fa] transition-colors"
                  >
                    <Eye className="h-5 w-5" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}