import axios from 'axios'

const api = axios.create({ baseURL:'/api' })

api.interceptors.request.use(cfg => {
  const token = localStorage.getItem('jwt_token')
  if (token) cfg.headers.Authorization = `Bearer ${token}`
  return cfg
})
api.interceptors.response.use(r=>r, e=>{
  if (e.response?.status===401){ localStorage.removeItem('jwt_token'); localStorage.removeItem('jwt_user'); window.location.reload() }
  return Promise.reject(e)
})

export const authAPI = {
  login: (email,password) => api.post('/users/auth/login',{email,password}),
  changePassword: d => api.post('/users/auth/change-password',d),
  me: () => api.get('/users/users/me')
}

export const adminAPI = {
  createUser: d => api.post('/users/admin/users',d),
  listUsers:  () => api.get('/users/admin/users'),
  toggleUser: id => api.patch(`/users/admin/users/${id}/toggle`),
  resetPassword: id => api.post(`/users/admin/users/${id}/reset-password`),
  deleteUser: id => api.delete(`/users/admin/users/${id}`)
}

export const usersAPI = {
  list: () => api.get('/users/users')
}

export const coursesAPI = {
  list:      ()          => api.get('/courses/courses'),
  create:    d           => api.post('/courses/courses',d),
  listFiles: id          => api.get(`/courses/courses/${id}/files`),
  upload:    (id,f)      => { const fd=new FormData(); fd.append('file',f); return api.post(`/courses/courses/${id}/files`,fd) },
  presign:   (cid,fid)   => api.get(`/courses/courses/${cid}/files/${fid}/presign`),
  download:  (cid,fid)   => api.get(`/courses/courses/${cid}/files/${fid}/download`,{responseType:'blob'}),
  delete:    id         => api.delete(`/courses/courses/${id}`),
  deleteFile:(cid,fid)   => api.delete(`/courses/courses/${cid}/files/${fid}`)
}

export const examsAPI = {
  list:               ()          => api.get('/exams/exams'),
  create:             d           => api.post('/exams/exams',d),
  uploadSujet:        (id,f)      => { const fd=new FormData(); fd.append('file',f); return api.post(`/exams/exams/${id}/upload-sujet`,fd) },
  downloadSujet:      id          => api.get(`/exams/exams/${id}/sujet/download`,{responseType:'blob'}),
  createSubmission:   eid         => api.post(`/exams/submissions?exam_id=${eid}`),
  uploadSubmission:   (sid,eid,f) => { const fd=new FormData(); fd.append('file',f); return api.post(`/exams/submissions/${sid}/upload?exam_id=${eid}`,fd) },
  downloadSubmission: sid         => api.get(`/exams/submissions/${sid}/download`,{responseType:'blob'}),
  listSubmissions:    eid         => api.get(`/exams/exams/${eid}/submissions`),
  deleteExam:         id          => api.delete(`/exams/exams/${id}`),
  grade:              (sid,d)     => api.patch(`/exams/submissions/${sid}/grade`,d),
  // Admin
  pendingApproval:    ()          => api.get('/exams/submissions/pending-approval'),

  approveGrade:       sid         => api.patch(`/exams/submissions/${sid}/approve-grade`),
  // Student
  myGrades:           ()          => api.get('/exams/submissions/my-grades')
}

export const messagingAPI = {
  send:         d   => api.post('/messaging/messages',d),
  conversation: uid => api.get(`/messaging/messages/conversation?user2_id=${uid}`),
  contacts:     ()  => api.get('/messaging/messages/contacts')
}

export const forumAPI = {
  categories:   ()        => api.get('/forum/forum/categories'),
  createCat:    d         => api.post('/forum/forum/categories',d),
  threads:      catId     => api.get(`/forum/forum/threads${catId?`?category_id=${catId}`:''}` ),
  getThread:    id        => api.get(`/forum/forum/threads/${id}`),
  createThread: d         => api.post('/forum/forum/threads',d),
  reply:        (tid,d)   => api.post(`/forum/forum/threads/${tid}/replies`,d),
  pin:          tid       => api.patch(`/forum/forum/threads/${tid}/pin`),
  lock:         tid       => api.patch(`/forum/forum/threads/${tid}/lock`),
  deleteThread: tid       => api.delete(`/forum/forum/threads/${tid}`)
}

export const calendarAPI = {
  list:   () => api.get('/calendar/events'),
  create: d  => api.post('/calendar/events',d)
}

export function downloadBlob(blob, filename){
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href=url; a.download=filename; a.click()
  URL.revokeObjectURL(url)
}

export function getUser(){
  try{ return JSON.parse(localStorage.getItem('jwt_user')) }
  catch{ return null }
}

export const notificationsAPI = {
  list:     () => api.get('/notifications/notifications'),
  markRead: id => api.post(`/notifications/notifications/read/${id}`),
  publish:  d  => api.post('/notifications/notifications/publish', d)
}
