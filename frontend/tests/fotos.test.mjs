import test from "node:test";
import assert from "node:assert/strict";
import { fotoPermitidaNoMapa } from "../src/lib/foto-url.ts";

const id="123e4567-e89b-12d3-a456-426614174000";
test("aceita a rota atual de imagens /api/fotos e formatos permitidos",()=>{
  for(const ext of ["jpg","png","webp"]) assert.equal(fotoPermitidaNoMapa("/api/fotos/"+id+"."+ext),true);
});
test("mantém compatibilidade com a rota antiga /uploads",()=>{
  assert.equal(fotoPermitidaNoMapa("/uploads/"+id+".jpg"),true);
});
test("bloqueia caminhos e formatos inesperados",()=>{
  for(const url of [null,undefined,"","https://externo.com/image.jpg","javascript:alert(1)","/api/fotos/../invalid.jpg","/api/fotos/"+id+".svg"]){
    assert.equal(fotoPermitidaNoMapa(url),false);
  }
});
