/**
 * Helper to generate a custom descriptive Patient ID.
 */
export const generateCustomPatientId = (patient: any) => {
  if (!patient) return '';

  // 1. Patient Name Initials (First & Last word)
  const nameParts = (patient.name || '').trim().split(/\s+/);
  let initials = '';
  if (nameParts.length > 0) {
    initials += nameParts[0].charAt(0).toUpperCase();
    if (nameParts.length > 1) {
      initials += nameParts[nameParts.length - 1].charAt(0).toUpperCase();
    } else {
      // If single name, repeat the first character
      initials += nameParts[0].charAt(0).toUpperCase();
    }
  } else {
    initials = 'XX';
  }

  // 2. Date: DDMM
  let dateCode = '0000';
  const dateVal = patient.admission_date || patient.created_at;
  if (dateVal) {
    const dateObj = new Date(dateVal);
    const dd = String(dateObj.getDate()).padStart(2, '0');
    const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
    dateCode = `${dd}${mm}`;
  }

  // 3. Hospital Name: NH
  const hospitalCode = 'NH';

  // 4. Consultant Doctor Name Initials
  let docName = patient.assigned_doctor_name || '';
  if (!docName) {
    docName = 'Dr. Pankaj Dubey';
  }
  if (!docName.toLowerCase().startsWith('dr')) {
    docName = 'Dr. ' + docName;
  }
  const docParts = docName.trim().split(/\s+/);
  const docInitials = docParts.map(part => part.replace(/[^a-zA-Z]/g, '').charAt(0).toUpperCase()).join('');

  // 5. Mobile Number (Last 4 digits only)
  const phone = String(patient.contact_number || '').replace(/\D/g, '');
  const shortPhone = phone.length >= 4 ? phone.slice(-4) : phone.padStart(4, '0');

  // 6. Unique code (halved length if hex hash)
  let uniqueCode = String(patient.id?.id || patient.id || '0');
  if (uniqueCode.length > 8) {
    uniqueCode = uniqueCode.slice(-4); // Reduced further to 4 chars
  }

  return `${initials}-${dateCode}-${hospitalCode}-${docInitials}-${shortPhone}-${uniqueCode}`;
};
