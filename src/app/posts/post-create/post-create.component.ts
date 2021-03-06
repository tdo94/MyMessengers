import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, ParamMap, Router } from '@angular/router';
import { Post } from 'src/app/_models/Post.model';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { PostsService } from 'src/app/_services/posts.service';
import { mimeType } from './mime-type.validator';
import { Subscription } from 'rxjs';
import { AuthService } from 'src/app/_services/auth.service';

@Component({
  selector: 'app-post-create',
  templateUrl: './post-create.component.html',
  styleUrls: ['./post-create.component.css']
})
export class PostCreateComponent implements OnInit, OnDestroy {
  mode = 'create';
  isLoading = false;
  postId: string;
  post: Post;
  form: FormGroup;
  imagePreview: string;
  private authListenerSub: Subscription;

  constructor (
    private postsService: PostsService,
    private route: ActivatedRoute,
    private authService: AuthService,
    private router: Router,
    private fb: FormBuilder
  ) { }

  ngOnInit() {
    this.authListenerSub = this.authService.getAuthStatusListener()
      .subscribe(() => this.isLoading = false);
    this.createForm();
    this.route.paramMap.subscribe((paramMap: ParamMap) => {
      if (paramMap.has("postId")) {
        this.mode = "edit";
        this.postId = paramMap.get("postId");
        this.isLoading = true;
        this.postsService.getPost(this.postId).subscribe(data => {
          this.post = {
            ...data.post,
            id: data.post._id,
          }
          this.form.setValue({
            title: this.post.title,
            content: this.post.content,
            image: this.post.imagePath
          })
          this.isLoading = false;
        });
      } else {
        this.mode = "create";
        this.postId = null;
      }
    })
  }

  ngOnDestroy() {
    this.authListenerSub.unsubscribe();
  }

  createForm() {
    this.form = this.fb.group({
      "title": ['', Validators.required],
      "content": ['', Validators.required],
      "image": ['', { validators: Validators.required, asyncValidators: mimeType }]
    })
  }

  onSavePost() {
    if (this.form.invalid) return;
    const { title, content, image } = this.form.value;
    this.isLoading = true;
    this.mode === "create" && this.postsService.addPost(title, content, image);
    this.mode === "edit" && this.postsService.updatePost(this.postId, title, content, image);
    this.form.reset();
  }

  onImagePicked(event: Event) {
    const file = (event.target as HTMLInputElement).files[0];
    this.form.patchValue({ image: file });
    this.form.get('image').updateValueAndValidity();
    const reader = new FileReader();
    reader.onload = () => {
      this.imagePreview = reader.result.toString();
    }
    reader.readAsDataURL(file);
  }

}
