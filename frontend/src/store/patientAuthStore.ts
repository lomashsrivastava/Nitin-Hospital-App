import { create } from 'zustand';
import api from '../api/axios';
import toast from 'react-hot-toast';

interface PatientAuthState {
  patientData: any | null;
  isPatientAuthenticated: boolean;
  isLoading: boolean;
  patientLogin: (patientId: string) => Promise<void>;
  patientLogout: () => void;
}

export const usePatientAuthStore = create<PatientAuthState>((set) => ({
  patientData: JSON.parse(localStorage.getItem('patient_portal_data') || 'null'),
  isPatientAuthenticated: !!localStorage.getItem('patient_portal_id'),
  isLoading: false,

  patientLogin: async (patientId: string) => {
    set({ isLoading: true });
    try {
      const res = await api.post('/hospital/patients/portal_login/', { patient_id: patientId });
      localStorage.setItem('patient_portal_id', patientId);
      localStorage.setItem('patient_portal_data', JSON.stringify(res.data));
      set({ patientData: res.data, isPatientAuthenticated: true, isLoading: false });
      toast.success('Access Granted! Welcome to Patient Portal.');
    } catch (error: any) {
      set({ isLoading: false });
      const errMsg = error.response?.data?.error || 'Authentication failed';
      toast.error(errMsg);
      throw new Error(errMsg);
    }
  },

  patientLogout: () => {
    localStorage.removeItem('patient_portal_id');
    localStorage.removeItem('patient_portal_data');
    set({ patientData: null, isPatientAuthenticated: false });
    toast.success('Logged out from Patient Portal');
  }
}));
