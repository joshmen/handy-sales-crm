/* eslint-disable @typescript-eslint/no-explicit-any */
import React from "react";
import { User } from "@/types";
import { Card, CardHeader, CardContent } from "@/components/ui";

interface UserAssignmentProps {
  selectedUser: User | null;
  users: User[];
  onUserSelect: (user: User) => void;
}

export const UserAssignment: React.FC<UserAssignmentProps> = ({
  selectedUser,
  users,
  onUserSelect,
}) => {
  return (
    <Card>
      <CardHeader>
        <h3 className="font-semibold flex items-center">
          <span className="mr-2">👤</span>
          Asigna la ruta a un usuario
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
              <p className="text-sm text-gray-600">{selectedUser.email}</p>
            </div>
            <button
              onClick={() => onUserSelect(null as any)}
              className="ml-auto text-sm text-blue-600 hover:underline"
            >
              Cambiar
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-gray-600 mb-3">Selecciona un usuario:</p>
            {users.map((user) => (
              <button
                key={user.id}
                onClick={() => onUserSelect(user)}
                className="w-full flex items-center p-3 border rounded hover:bg-gray-50"
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
                  <p className="text-sm text-gray-600">{user.email}</p>
                </div>
              </button>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
