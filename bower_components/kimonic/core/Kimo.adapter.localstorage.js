/*
 *how the localStorage is suposed to work
 *Chaque repository pos
 *
 **/

/*
*Repositry must know that a content is a reference to an other one
**/


/*usenamespace
 *or application key
 *user repository map
 **/
require({
    
    paths: {
        "vendor.crypto": "kimonic/vendor/cryptojslib/rollups/md5"
    }
});
define(["Kimo.Utils", "Kimo.ModelAdapter", "vendor.crypto"], function(Utils, AdapterRegistry, Crypto){
    var JsonRepository = function(repositoryName, callbacks){
        JsonRepository.repositoryMap = {};
        var _repoMap = JsonRepository.repositoryMap;
        this.init = function(repositoryName){
            var repoMatch = /repository/gi;
            repositoryName = (repositoryName.match(repoMatch)) ? repositoryName :repositoryName+"Repository";
            this.repositoryname = CryptoJS.MD5(repositoryName.toLowerCase()).toString();
            this.data = {};
            this.createOrRetrieveDb();
        } 
        /*create or retrieve*/
        this.createOrRetrieveDb = function(){
            var data = localStorage.getItem(this.repositoryname);
            if(data){
                this.data = JSON.parse(data);
            }
        
        }
    
        this.persist = function(){
            localStorage.setItem(this.repositoryname,JSON.stringify(this.data)); 
        }
        
        this.init(repositoryName);

   
    }
    JsonRepository.prototype.reset = function(){
        this.data = {};
        this.persist();
    }

    JsonRepository.prototype.add = function(key,value){
        this.data[key]= value;
        this.persist();
    }

    JsonRepository.prototype.find = function(key){
        return this.data[key];
    }

    JsonRepository.prototype.findAll = function(){
        var dfd = new $.Deferred();
        dfd.resolve({result:this.data});
        return dfd.promise();
    }

    JsonRepository.prototype.remove = function(key){
        delete(this.data[key]);
        this.persist();
    }

    /*** adapter ***/
    var jsonadapter = {
        settings: {
            availableActions: ["create","read","update","remove"] 
        },
        store : null,
    
        invoke : function(action,model,repository,callbacks){
            if(this.settings.availableActions[action]=="undefined") return false;
            if(typeof repository!="string") return false;
            this.store = new JsonRepository(repository);
            this[action].call(this,model);
        /*handle callbacks here*/
        },
    
        /* récupérer un model dans */
        find : function(key){
            return this.store.find(key);
        },
    
        findAll : function(repository,options){
            /*options can contain limit ordering and start*/
            var repository = repository.replace(/repository/gi,"");
            var store = new JsonRepository(repository);
            return store.findAll();
        },
    
        create : function(model){
            if(model.uid){
                this.update(model);
                return;
            }
            var uid = Utils.generateId("entity");
            var jsonData = model.toJson(); 
            jsonData.uid = uid; 
            this.store.add(uid,jsonData);
            model.uid = uid;
        },
    
        remove : function(model){
            if(!model.uid) return;
            this.store.remove(model.uid);
        },
    
        update : function(model){
            if(model.uid){
                this.store.add(model.uid,model.toJson());
                return;
            }  
            this.create(model);
        }
    }
    /* Register */
    AdapterRegistry.register("localStorage", jsonadapter);
});