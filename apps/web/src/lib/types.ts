export interface Me {
  id: string
  name: string
  email: string
  role: 'student' | 'admin'
}

export interface Church {
  id: string
  name: string
  latitude: number
  longitude: number
  radiusMeters: number
}

export interface AdminStudent {
  id: string
  name: string
  email: string
  isBlocked: boolean
  blockedAt: string | null
  unblockedAt: string | null
  class: { id: string; name: string } | null
  _count: { absences: number; attendances: number }
  createdAt: string
}

export interface AdminClass {
  id: string
  name: string
  church: { id: string; name: string } | null
  _count: { users: number; events: number }
  createdAt: string
}

export interface AdminEvent {
  id: string
  name: string
  eventDate: string
  classId: string
  class: { id: string; name: string }
  _count: { attendances: number; absences: number }
  createdAt: string
}

export interface Summary {
  totalStudents: number
  blockedStudents: number
  todayAttendances: number
}

export interface BlockedStudent {
  id: string
  name: string
  email: string
  blockedAt: string | null
  unblockedAt: string | null
  class: { id: string; name: string } | null
  _count: { absences: number; attendances: number }
}

export interface ByStudentReport {
  events: { id: string; name: string; eventDate: string; classId: string }[]
  students: {
    id: string
    name: string
    email: string
    className: string | null
    present: number
    absences: number
  }[]
}

export interface ByClassReport {
  events: { id: string; name: string; eventDate: string; classId: string }[]
  classes: {
    id: string
    name: string
    enrolled: number
    totalExpected: number
    totalPresent: number
    totalAbsences: number
    attendanceRate: number | null
  }[]
}