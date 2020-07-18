import { reverseHash, squash } from 'lib/util'

const url = {
  mobile: url => `/mobile/${url}`
}

export const sections = {
  daily: {
    icon: '/static/icons/activities.svg',
    text: 'Activities',
    route: '/mobile/daily'
  },
  login: {
    icon: '/static/icons/logo-only.svg',
    text: 'Vitarka',
    route: '/mobile/login',
    black: true
  },
  deliveries: {
    icon: '/static/icons/deliveries.svg',
    text: 'Deliveries',
    route: '/mobile/deliveries'
  },
  notifications: {
    icon: '/static/icons/notifications.svg',
    text: 'Notifications',
    route: '/mobile/notifications'
  },
  equipment: {
    icon: '/static/icons/equipment.svg',
    text: 'Equipment',
    route: '/mobile/equipment'
  },
  resources: {
    icon: '/static/icons/resources.svg',
    text: 'Resources',
    route: '/mobile/resources'
  },
  resourceDetails: {
    route: '/mobile/resource-details'
  },
  documents: {
    icon: '/static/icons/documents.svg',
    text: 'Documents',
    route: '/mobile/documents'
  },
  statusUpdate: {
    route: url.mobile('status-update')
  }
}
export const routes = squash(sections, 'route')
export const pathnames = reverseHash(routes)
