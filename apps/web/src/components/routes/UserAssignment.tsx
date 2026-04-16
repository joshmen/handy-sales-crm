import React from "react";
import { useTranslations } from "next-intl";
import { User } from "@/types";
import { Card, CardHeader, CardContent } from "@/components/ui";

interface UserAssignmentProps {
  selectedUser: User | null;
  users: User[];
  onUserSelect: (user: User | null) => void;
}

export const UserAssignment: React.FC<UserAssignmentProps> = ({
  selectedUser,
  users,
  onUserSelect,
}) => {
  const t = useTranslations('routes.userAssignment');

  return (
    <Card>
      <CardHeader>
        <h3 className="font-semibold flex items-center">
          <span className="mr-2">👤</span>
          {t('assignUser')}
        </h3>
      </CardHeader>
      <CardContent>
        {selectedUser ? (
          <div className="flex items-center">
            <div className="w-10 h-10 bg-teal-500 rounded-full flex items-center justify-center text-white font-semibold mr-3">
              {selectedUser.name
                .split(" ")
                .map((n) => n[0])
                .join("")
                .toUpperCase()}
            </div>
            <div>
              <p className="font-medium">{selectedUser.name}</p>
              <p className="text-sm text-foreground/70">{selectedUser.email}</p>
            </div>
            <button
              onClick={() => onUserSelect(null)}
              className="ml-auto text-sm text-blue-600 hover:underline"
            >
              {t('change')}
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-foreground/70 mb-3">{t('selectUser')}</p>
            {users.map((user) => (
              <button
                key={user.id}
                onClick={() => onUserSelect(user)}
                className="w-full flex items-center p-3 border rounded hover:bg-surface-1"
              >
                <div className="w-10 h-10 bg-teal-500 rounded-full flex items-center justify-center text-white font-semibold mr-3">
                  {user.name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                    .toUpperCase()}
                </div>
                <div className="text-left">
                  <p className="font-medium">{user.name}</p>
                  <p className="text-sm text-foreground/70">{user.email}</p>
                </div>
              </button>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
