import Api, {Client, Resources} from '../src/index.js'
import {ClientError, ServerError} from '../src/errors'
import { expect } from 'chai'
import nock from 'nock'

const hugo = {
  _id: '1',
  username: 'hugox123',
  email: 'hugo.cabret@gmail.com'
}

const hugoCredentials = {
  username: hugo.username,
  password: '123hugox'
}

const luck = {
  _id: '2',
  username: 'lucky.green',
  email: 'luck.skywalker@futurecommerce.mx'
}

const squirtle = {
  username: 'squirtlesquirtle',
  email: 'squirtle@pokemon.wl'
}

const blastoise = {
  email: 'blastoise@pokemon.wl'
}

const apiConfig = {
  protocol: 'https',
  host: 'myhost.com',
  port: 3000 ,
  basePath: '/api',
  version: 2
}

const apiBaseUrl = 'https://myhost.com:3000/api/v2'

const authToken = 'Bearer ds97we789ewq7dasd987sad987sda732sda983n4d7sad'

const customHeaderValue = 'hello world'

before(() => {

  let apiMock = nock(apiBaseUrl)
        .get('/users/1').reply(200, hugo)
        .get('/users/666').reply(404, { code: 1401 })
        .get('/users/2').reply(200, luck)
        .post('/users/bad').reply(400, { code: 400, message: { notAllowed: '\"notAllowed\" is not Allowed' } })
        .post('/users', squirtle).times(2).reply(201, {_id: 3})
        .put('/users/3', blastoise).times(2).reply(200, {...squirtle, ...blastoise})
        .delete('/users/3').times(2).reply(200, {deleted: true})

  Api(apiConfig)
})


describe('Api Calls', () => {
  it(`should fetch users with id 1 ans 2`, async function () {
    let apiClient = new Client();
    let Users = new Resources('/users')

    let user = await apiClient.get('/users/1')
    let usertwo = await Users.get('2')


    expect(user).to.have.property('username', hugo.username)
    expect(user).to.have.property('email', hugo.email)
    expect(usertwo).to.have.property('username', luck.username)
    expect(usertwo).to.have.property('email', luck.email)
  })

  it('Should handle 404 error', async function (done) {
    let apiClient = new Client();
    try {
      let user = await apiClient.get('/users/666')
      done(user)
    } catch (error) {
      expect(error).to.be.an.instanceof(ClientError)
      expect(error).to.have.property('code', 404)
      expect(error.data).to.have.property('code', 1401)
      expect(error).to.have.property('message')
      done()
    }
  })

  it('Should handle 400 error (bad request)', async function (done) {
    let apiClient = new Client();
    try {
      let user = await apiClient.post('/users/bad', { notAllowed: true })
      done(user)
    } catch (error) {
      expect(error).to.be.an.instanceof(ClientError)
      expect(error).to.have.property('code', 400)
      expect(error).to.have.property('message')
      done()
    }
  })


  it(`should post new user.`, async function () {
    let apiClient = new Client();
    let Users = new Resources('/users')

    let user = await apiClient.post('/users', squirtle)
    let usertwo = await Users.post(squirtle)


    expect(user).to.have.property('_id', 3)
    expect(usertwo).to.have.property('_id', 3)
  })

  it(`should update the new user email.`, async function () {
    let apiClient = new Client();
    let Users = new Resources('/users')

    let user = await apiClient.put('/users/3', blastoise)
    let usertwo = await Users.put('3', blastoise)


    expect(user).to.have.property('email', blastoise.email)
    expect(usertwo).to.have.property('email', blastoise.email)
  })

  it(`should delete the new user.`, async function () {
    let apiClient = new Client();
    let Users = new Resources('/users')

    let response = await apiClient.delete('/users/3')
    let responsetwo = await Users.delete('3')

    expect(response).to.have.property('deleted', true)
    expect(responsetwo).to.have.property('deleted', true)
  })
})

before(() => {

  let apiMock = nock(apiBaseUrl)
        .post('/auth/login', hugoCredentials).reply(200, {token: authToken})


  let vipApiMock = nock(apiBaseUrl, {
    reqheaders: {
      'authorization': authToken
    }
  })
        .get('/users/1').times(2).reply(200, hugo)
        .get('/users/2').reply(200, luck)
        .get('/users/666').reply(404, { code: 1401 })
        .post('/users/bad').reply(400, { code: 400, message: { notAllowed: '\"notAllowed\" is not Allowed' } })
        .post('/users', squirtle).times(2).reply(201, {_id: 3})
        .put('/users/3', blastoise).times(2).reply(200, {...squirtle, ...blastoise})
        .delete('/users/3').times(2).reply(200, {deleted: true})
        .get('/myHeader').reply(function(uri, bodyRequest){
          return [200, {'myheader': this.req.headers.myheader[0]}]
        })
        .get('/myHeaderTwo').reply(function(uri, bodyRequest){
          return [200, {'myheadertwo': this.req.headers.myheadertwo[0]}]
        })

  Api(apiConfig)

  nock.emitter.on('no match', function(req) {
    let mReq = req;
  });

  nock.emitter.on('request', function(req, interceptor) {
    let mReq = req;
    let intercept = interceptor
  });

})

describe('Api Calls With Auth', () => {
  it(`should try to fetch users with id 1 and fail`, async function (done) {
    let apiClient = new Client()

    try {
      let user = await apiClient.get('/users/1')
    } catch (error) {
      expect(error).to.be.an.instanceof(Error)
      done()
    }
  })

  it(`should logIn and set Auth token and fetch users with id 1 ans 2`, async function () {
    let apiClient = new Client();
    let Users = new Resources('/users')

    let {token} = await apiClient.post('/auth/login', hugoCredentials)
    apiClient.setAuthToken(function(){ return token })

    let user = await apiClient.get('/users/1')
    let usertwo = await Users.get('2')

    expect(token).to.equal(authToken)
    expect(user).to.have.property('username', hugo.username)
    expect(user).to.have.property('email', hugo.email)
    expect(usertwo).to.have.property('username', luck.username)
    expect(usertwo).to.have.property('email', luck.email)
  })

  it('Should handle 404 error', async function (done) {
    let apiClient = new Client();
    try {
      let user = await apiClient.get('/users/666')
      done(user)
    } catch (error) {
      expect(error).to.be.an.instanceof(ClientError)
      expect(error).to.have.property('code', 404)
      expect(error.data).to.have.property('code', 1401)
      expect(error).to.have.property('message')
      done()
    }
  })

  it('Should handle 400 error (bad request)', async function (done) {
    let apiClient = new Client();
    try {
      let user = await apiClient.post('/users/bad', { notAllowed: true })
      done(user)
    } catch (error) {
      expect(error).to.be.an.instanceof(ClientError)
      expect(error).to.have.property('code', 400)
      expect(error).to.have.property('message')
      done()
    }
  })


  it(`should post new user.`, async function () {
    let apiClient = new Client();
    let Users = new Resources('/users')

    let user = await apiClient.post('/users', squirtle)
    let usertwo = await Users.post(squirtle)


    expect(user).to.have.property('_id', 3)
    expect(usertwo).to.have.property('_id', 3)
  })

  it(`should update the new user email.`, async function () {
    let apiClient = new Client();
    let Users = new Resources('/users')

    let user = await apiClient.put('/users/3', blastoise)
    let usertwo = await Users.put('3', blastoise)


    expect(user).to.have.property('email', blastoise.email)
    expect(usertwo).to.have.property('email', blastoise.email)
  })

  it(`should delete the new user.`, async function () {
    let apiClient = new Client();
    let Users = new Resources('/users')

    let response = await apiClient.delete('/users/3')
    let responsetwo = await Users.delete('3')

    expect(response).to.have.property('deleted', true)
    expect(responsetwo).to.have.property('deleted', true)
  })

  it(`set a middleware to change header.`, async function () {
    let apiClient = new Client();

    apiClient.addMiddleware(function addCustomHeader(url, options){
      options.headers = {...options.headers, Myheader: customHeaderValue}
    })

    let response = await apiClient.get('/myHeader')

    expect(response.myheader).to.equal(customHeaderValue)
  })

  it(`set a middleware with object to catch request and response.`, async function () {
    let apiClient = new Client();

    apiClient.addMiddleware({
      request: (url, options) => {
        options.headers = {...options.headers, Myheadertwo: customHeaderValue}
        return [url, options]
      },
      response: (response) => {
        response.modified = true
        return response
      }})

    let response = await apiClient.get('/myHeaderTwo')

    expect(response.myheadertwo).to.equal(customHeaderValue)
    expect(response.modified).to.be.true
  })
})
