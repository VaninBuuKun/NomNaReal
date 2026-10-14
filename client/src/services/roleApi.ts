import { httpClient } from "./httpClient";
import type {
  Role,
  CreateRoleRequest,
  UpdateRoleRequest,
  ChannelOverwrite,
  SetChannelOverwriteRequest,
} from "../types";

export const roleApi = {
  // Roles CRUD
  getRoles: async (serverId: string): Promise<Role[]> => {
    const res = await httpClient.get<Role[]>(`/servers/${serverId}/roles`);
    return res.data;
  },

  createRole: async (serverId: string, data: CreateRoleRequest): Promise<Role> => {
    const res = await httpClient.post<Role>(`/servers/${serverId}/roles`, data);
    return res.data;
  },

  updateRole: async (
    serverId: string,
    roleId: string,
    data: UpdateRoleRequest
  ): Promise<Role> => {
    const res = await httpClient.put<Role>(`/servers/${serverId}/roles/${roleId}`, data);
    return res.data;
  },

  deleteRole: async (serverId: string, roleId: string): Promise<void> => {
    await httpClient.delete<void>(`/servers/${serverId}/roles/${roleId}`);
  },

  // Member Role assignment
  assignRole: async (
    serverId: string,
    memberId: string,
    roleId: string
  ): Promise<void> => {
    await httpClient.post<void>(
      `/servers/${serverId}/members/${memberId}/roles/${roleId}`
    );
  },

  unassignRole: async (
    serverId: string,
    memberId: string,
    roleId: string
  ): Promise<void> => {
    await httpClient.delete<void>(
      `/servers/${serverId}/members/${memberId}/roles/${roleId}`
    );
  },

  // Channel Overwrites
  getChannelOverwrites: async (channelId: string): Promise<ChannelOverwrite[]> => {
    const res = await httpClient.get<ChannelOverwrite[]>(`/channels/${channelId}/overwrites`);
    return res.data;
  },

  setChannelOverwrite: async (
    channelId: string,
    data: SetChannelOverwriteRequest
  ): Promise<ChannelOverwrite> => {
    const res = await httpClient.put<ChannelOverwrite>(
      `/channels/${channelId}/overwrites`,
      data
    );
    return res.data;
  },

  deleteChannelOverwrite: async (
    channelId: string,
    overwriteId: string
  ): Promise<void> => {
    await httpClient.delete<void>(
      `/channels/${channelId}/overwrites/${overwriteId}`
    );
  },
};
