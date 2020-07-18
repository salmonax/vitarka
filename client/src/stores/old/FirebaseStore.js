import { observable } from 'mobx'
import uuid from 'uuid'

window.uuid = uuid
// import { ACTIVITIES } from 'fixtures'

// const _storage = firebase.storage()

const COLLECTIONS = ['laydowns', 'images', 'activities']

export default class FirebaseStore {
  constructor (state = {}, rootStore, collections = COLLECTIONS, db, storage) {
    window._f = this
    // db.settings({ timestampsInSnapshots: true })
    this.db = db
    this.storage = storage
    this.rootStore = rootStore

    // This got out of hand quick... extract this out to separate class
    collections.forEach(entityType => {
      // this.__addModifyListener(entityType)
      this[entityType] = {
        list: observable([]),
        hash: observable({}),
        hydrate: this._hydrate.bind(this, entityType),
        add: this._add.bind(this, entityType),
        update: this._update.bind(this, entityType),
        hydrateOne: this._hydrateOne.bind(this, entityType)
      }
    })
    this.entityTypes = collections
  }

  hydrateAll () {
    // return Promise.all(this.entityTypes.map(type => this[type].hydrate()))
  }

  __addModifyListener (entityType) {
    this.db.collection(entityType)
      .where('modified', '>=', Date.now())
      .onSnapshot(snap => {
        snap.docChanges.forEach(({ doc, type }) => {
          this._hydrateOne(entityType, doc.id, doc, (item) => {
            // console.warn(`FIREBASE UPDATED (${type}): `, item)
          })
        })
      })
  }

  // Doesn't handle remove
  _hydrateOne (entityType, id, doc, cb) {
    return (doc ? Promise.resolve(doc)
      : this.db.collection(entityType).doc(id).get()).then(n => {
      const item = Object.assign(n.data(), { id: n.id })
      this[entityType].hash[n.id] = item
      const { list } = this[entityType]
      const index = list.findIndex(m => m.id === n.id)
      if (index === -1) {
        list.push(item)
      } else {
        console.warn(this[entityType].list)
        list[list.findIndex(m => m.id === n.id)] = item
        console.warn(this[entityType].list)
      }
      if (cb) cb(item)
      return list
    })
  }
  _hydrate (entityType) {
    return this.db.collection(entityType).get().then(snap => {
      const newList = snap.docs.map(n => {
        const item = Object.assign(n.data(), { id: n.id })
        this[entityType].hash[n.id] = item
        return item
      })
      this[entityType].list.replace(newList)
      return this[entityType].list
    })
  }
  // needs schema check
  _add (entityType, item) {
    return this.db.collection(entityType).add(Object.assign(item, {
      created: Date.now(),
      modified: Date.now()
    })).then(({id}) => this._hydrateOne(entityType, id))
  }
  _update (entityType, id, patch) {
    return this.db.collection(entityType).doc(id).set({
      ...patch,
      modified: Date.now()
    },
    {
      merge: true
    }).then(n => this._hydrateOne(entityType, id))
  }

  uploadFile (file, relations = {}, path = '/images', cb) {
    const { email } = this.rootStore.auth.currentUser

    const uploadRef = this.storage.ref().child(`${path}/${email}/${file.name}__${uuid()}`)
    const uploadTask = uploadRef.put(file)


    if (typeof cb === 'function') {
      uploadTask.on('state_changed', snap => {
        const progress = Math.round((snap.bytesTransferred / snap.totalBytes) * 100)
        console.warn(progress)
        cb(progress)
      })      
    }

    return uploadTask.then(snap => {
      const { downloadURL } = snap
      const {
        contentType,
        name,
        fullPath,
        md5Hash
      } = snap.metadata

      const { id, collection } = relations

      const relKey = `${collection}_id`


      // These are for uploading a corresponding record
      // to firebase and repopulating the local store
      // Call the new one here

      // const relEntity = this[collection].hash[id]

      // this[collection].update(id, {
      //   images: (Array.isArray(relEntity.images) ? 
      //     relEntity.images : []).concat(id)
      // })

      // this.images.add(Object.assign({
      //   downloadURL,
      //   contentType,
      //   name,
      //   fullPath,
      //   md5Hash
      // }), {
      //   [relKey]: id
      // })
      return downloadURL 
    })

  }
}
